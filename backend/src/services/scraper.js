const cheerio = require('cheerio');

/**
 * Scrapes a business website and extracts key information.
 * Uses Cheerio for lightweight HTML parsing (no browser needed).
 * Handles most SMB websites (WordPress, Wix, Squarespace, static HTML).
 */
async function scrapeWebsite(url) {
  try {
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrinityPixelsBot/1.0; +https://trinitypixels.in)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, and nav elements to clean text
    $('script, style, nav, footer, header, iframe, noscript').remove();

    // Extract business name
    const businessName = extractBusinessName($, url);

    // Extract services/offerings
    const services = extractServices($);

    // Extract contact info
    const contact = extractContactInfo($, html);

    // Extract operating hours
    const hours = extractHours($, html);

    // Extract FAQs
    const faqs = extractFAQs($);

    // Extract page description/about
    const description = extractDescription($);

    return {
      success: true,
      business_name: businessName,
      description,
      services,
      contact,
      hours,
      faqs,
      source_url: url,
      scraped_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Scraper error:', err.message);
    return {
      success: false,
      error: err.message,
      source_url: url,
    };
  }
}

function extractBusinessName($, url) {
  // Try og:site_name first (most reliable)
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return ogSiteName.trim();

  // Try the title tag
  const title = $('title').text().trim();
  if (title) {
    // Remove common suffixes like " | Home", " - Welcome", etc.
    return title.replace(/\s*[-|–]\s*(Home|Welcome|Official|Website|Page).*$/i, '').trim();
  }

  // Fall back to domain name
  try {
    const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
    return hostname.replace('www.', '').split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return 'Business';
  }
}

function extractServices($) {
  const services = [];

  // Look for service-related headings and their content
  $('h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.match(/service|offer|what we do|our work|treatment|package|product|program|class|course|specialit/i)) {
      // Get the list items or paragraphs after this heading
      const sibling = $(el).next();
      if (sibling.is('ul, ol')) {
        sibling.find('li').each((_, li) => {
          const item = $(li).text().trim();
          if (item.length > 2 && item.length < 200) services.push(item);
        });
      } else if (sibling.is('p')) {
        const item = sibling.text().trim();
        if (item.length > 5 && item.length < 500) services.push(item);
      }
    }
  });

  // Also check for common service list patterns
  if (services.length === 0) {
    $('.service, .services, [class*="service"], [class*="offering"], [class*="feature"]').each((_, el) => {
      const heading = $(el).find('h2, h3, h4, h5, .title, strong').first().text().trim();
      if (heading && heading.length > 2 && heading.length < 200) {
        services.push(heading);
      }
    });
  }

  return services.slice(0, 10); // Max 10 services
}

function extractContactInfo($, html) {
  const contact = {};

  // Phone numbers (Indian format)
  const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g;
  const phones = html.match(phoneRegex);
  if (phones) {
    contact.phone = [...new Set(phones)].slice(0, 3);
  }

  // Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex);
  if (emails) {
    contact.email = [...new Set(emails)].filter(e => !e.includes('example') && !e.includes('wix') && !e.includes('wordpress')).slice(0, 2);
  }

  // Address
  $('[class*="address"], [itemtype*="PostalAddress"], address').each((_, el) => {
    const addr = $(el).text().trim();
    if (addr.length > 10 && addr.length < 300) {
      contact.address = addr;
    }
  });

  return contact;
}

function extractHours($, html) {
  const hoursText = [];

  // Look for hours-related elements
  $('[class*="hour"], [class*="timing"], [class*="schedule"], [class*="time"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 500 && text.match(/\d/)) {
      hoursText.push(text);
    }
  });

  // Look for common patterns in the raw HTML
  const hourPatterns = html.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s\S]{0,100}?\d{1,2}[:.]\d{2}/gi);
  if (hourPatterns) {
    hoursText.push(...hourPatterns.slice(0, 5));
  }

  return hoursText.length > 0 ? hoursText.join('; ') : '';
}

function extractFAQs($) {
  const faqs = [];

  // Look for FAQ sections
  $('[class*="faq"], [class*="FAQ"], [id*="faq"], [id*="FAQ"], details, .accordion').each((_, el) => {
    const question = $(el).find('h2, h3, h4, h5, summary, .question, [class*="question"], button').first().text().trim();
    const answer = $(el).find('p, .answer, [class*="answer"], dd').first().text().trim();

    if (question && answer && question.length > 5 && answer.length > 5) {
      faqs.push({ q: question.slice(0, 200), a: answer.slice(0, 500) });
    }
  });

  return faqs.slice(0, 8); // Max 8 FAQs
}

function extractDescription($) {
  // Try meta description first
  const metaDesc = $('meta[name="description"]').attr('content') ||
                   $('meta[property="og:description"]').attr('content');
  if (metaDesc) return metaDesc.trim();

  // Try the first substantial paragraph
  let desc = '';
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (!desc && text.length > 50 && text.length < 500) {
      desc = text;
    }
  });

  return desc || '';
}

module.exports = { scrapeWebsite };
