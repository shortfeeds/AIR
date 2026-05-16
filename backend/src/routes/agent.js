const express = require('express');
const db = require('../db/pool');

const router = express.Router();

/**
 * GET /api/agent/prompt/:clientId
 * Generates a dynamic, fully-formatted system prompt for the AI Voice Agent.
 * Accepts optional ?caller_number=... for deterministic A/B testing.
 */
router.get('/prompt/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { caller_number } = req.query;

    // Fetch knowledge base and subscription info
    const kbResult = await db.query(`
      SELECT 
        u.name, 
        cp.business_name, 
        s.plan_name, 
        kb.primary_services, 
        kb.top_faqs, 
        kb.ai_goal, 
        kb.booking_link, 
        kb.language,
        kb.voice_id,
        kb.ab_split_active
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      JOIN subscriptions s ON s.client_id = u.id
      JOIN knowledge_base kb ON kb.client_id = u.id
      WHERE u.id = $1
    `, [clientId]);

    if (kbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or knowledge base not configured' });
    }

    const data = kbResult.rows[0];

    // Fetch active prompt versions for this client
    const promptRes = await db.query(
      `SELECT variant, prompt_text FROM prompt_versions WHERE client_id = $1 AND is_active = true`,
      [clientId]
    );

    let promptA = null;
    let promptB = null;

    promptRes.rows.forEach(r => {
      if (r.variant === 'A') promptA = r.prompt_text;
      if (r.variant === 'B') promptB = r.prompt_text;
    });

    let systemPrompt = '';
    let usedPromptVersion = 'A';

    // If there is no explicit Prompt A in the DB, fallback to dynamic generation
    if (!promptA) {
      promptA = `
# SYSTEM PROMPT: ${data.business_name || data.name}'s AI Receptionist

## IDENTITY & GOAL
You are a professional, helpful AI receptionist for ${data.business_name || data.name}. 
Your primary goal is: ${data.ai_goal.replace('_', ' ')}.

## LANGUAGE
Speak in ${data.language}. If the language is "Hinglish", use a mix of Hindi and English as commonly spoken in urban India.

## KNOWLEDGE
- **Services**: ${data.primary_services}
- **FAQs**: ${JSON.stringify(data.top_faqs)}

## KEY INSTRUCTIONS
1. Be concise. This is a voice call, not a text chat.
2. If the user asks for pricing or details you don't know, tell them a team member will call them back.
${data.booking_link ? `3. If the user wants to book an appointment, provide them this link: ${data.booking_link}` : ''}
      `.trim();
    }

    systemPrompt = promptA;

    // Deterministic A/B Testing Override
    if (data.ab_split_active && promptB) {
      if (caller_number) {
        // Hash the caller number to deterministically route them to A or B
        let hash = 0;
        for (let i = 0; i < caller_number.length; i++) {
          hash = ((hash << 5) - hash) + caller_number.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        if (Math.abs(hash) % 2 === 1) {
          systemPrompt = promptB;
          usedPromptVersion = 'B';
        }
      } else {
        // Fallback to random if caller number is unknown
        if (Math.random() > 0.5) {
          systemPrompt = promptB;
          usedPromptVersion = 'B';
        }
      }
    }

    res.json({ 
      prompt: systemPrompt,
      language: data.language,
      voice_id: data.voice_id,
      plan: data.plan_name,
      used_prompt: usedPromptVersion
    });
  } catch (err) {
    console.error('Agent prompt generation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
