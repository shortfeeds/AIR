const express = require('express');
const db = require('../db/pool');
const { scrapeWebsite } = require('../services/scraper');
const { generatePrompt, detectIndustry, getIndustryTemplates } = require('../services/promptGenerator');

const router = express.Router();

// Demo Plivo number for AI Preview Calls
const DEMO_NUMBER = process.env.DEMO_PLIVO_NUMBER || '+917710884479';

/**
 * POST /api/demo/generate
 * Real implementation: scrapes website, generates AI persona, creates a demo session.
 * Returns a PIN that the prospect can use to call the shared demo number.
 */
router.post('/generate', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    // 1. Scrape the website
    const scraped = await scrapeWebsite(url);

    if (!scraped.success) {
      // Even if scraping fails, generate a basic prompt from the URL
      const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      const businessName = domain.split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      scraped.success = true;
      scraped.business_name = businessName;
      scraped.description = '';
      scraped.services = [];
      scraped.faqs = [];
      scraped.contact = {};
      scraped.hours = '';
    }

    // 2. Generate the AI prompt
    const result = await generatePrompt(scraped);

    // 3. Generate a unique 4-digit PIN for this demo session
    const pin = String(Math.floor(1000 + Math.random() * 9000));

    // 4. Store the demo session in the database
    try {
      await db.query(
        `INSERT INTO demo_sessions (website_url, business_name, generated_prompt, scraped_data, demo_pin, demo_number, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '48 hours')`,
        [url, scraped.business_name, result.prompt, JSON.stringify(scraped), pin, DEMO_NUMBER]
      );
    } catch (dbErr) {
      // If demo_sessions table doesn't exist yet, still return the result
      console.warn('Demo session DB save failed (table may not exist yet):', dbErr.message);
    }

    // 5. Return the result
    res.json({
      success: true,
      business_name: scraped.business_name,
      industry: result.industry_label,
      generated_prompt: result.prompt,
      demo_number: DEMO_NUMBER.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3'),
      pin,
      services_found: scraped.services?.length || 0,
      faqs_found: scraped.faqs?.length || 0,
      expires_in: '48 hours',
    });
  } catch (err) {
    console.error('Demo generation error:', err);
    res.status(500).json({ error: 'Failed to generate AI preview. Please try again.' });
  }
});

/**
 * GET /api/demo/industries
 * Returns the list of supported industry templates.
 */
router.get('/industries', (req, res) => {
  res.json({ industries: getIndustryTemplates() });
});

/**
 * GET /api/demo/lookup-pin/:pin
 * Used by the Plivo call handler to find the demo session for a given PIN.
 * This is called during the AI Preview Call flow.
 */
router.get('/lookup-pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    const result = await db.query(
      `SELECT id, business_name, generated_prompt, website_url
       FROM demo_sessions
       WHERE demo_pin = $1 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [pin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demo session not found or expired' });
    }

    res.json({ session: result.rows[0] });
  } catch (err) {
    console.error('PIN lookup error:', err);
    res.status(500).json({ error: 'Failed to look up demo session' });
  }
});

/**
 * POST /api/demo/scrape-only
 * Admin tool: just scrape a website and return the data without creating a demo session.
 * Used by the admin "Quick Onboard" feature.
 */
router.post('/scrape-only', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const scraped = await scrapeWebsite(url);
    const industry = detectIndustry(scraped);
    const result = await generatePrompt(scraped, { industry });

    res.json({
      scraped,
      prompt: result,
      detected_industry: industry,
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

module.exports = router;
