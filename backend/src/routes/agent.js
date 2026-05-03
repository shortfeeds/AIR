const express = require('express');
const db = require('../db/pool');

const router = express.Router();

/**
 * GET /api/agent/prompt/:clientId
 * Generates a dynamic, fully-formatted system prompt for the AI Voice Agent.
 * This is designed to be called by your Python/LiveKit worker.
 */
router.get('/prompt/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Fetch knowledge base and subscription info
    const result = await db.query(`
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
        kb.prompt_b,
        kb.ab_split_active
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      JOIN subscriptions s ON s.client_id = u.id
      JOIN knowledge_base kb ON kb.client_id = u.id
      WHERE u.id = $1
    `, [clientId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or knowledge base not configured' });
    }

    const data = result.rows[0];
    let usedPromptVersion = 'A';

    // Build the dynamic prompt
    let systemPrompt = `
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

    // A/B Testing Override
    if (data.ab_split_active && data.prompt_b && Math.random() > 0.5) {
      systemPrompt = data.prompt_b;
      usedPromptVersion = 'B';
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
