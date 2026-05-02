const express = require('express');
const router = express.Router();

/**
 * POST /api/demo/generate
 * Simulates scraping a website and generating an AI Persona.
 */
router.post('/generate', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Simulate scraping delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated persona generation based on URL keywords
    const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    const businessName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

    const mockPrompt = `
You are the AI Receptionist for ${businessName}. 
You have been specifically trained using data from ${url}.
Your tone is professional, helpful, and conversational.
You can answer questions about ${businessName}'s services, pricing, and availability.
    `.trim();

    res.json({
      success: true,
      business_name: businessName,
      generated_prompt: mockPrompt,
      demo_number: '+91 XXXX-XXXX-XX',
      pin: Math.floor(1000 + Math.random() * 9000).toString()
    });
  } catch (err) {
    console.error('Demo generation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
