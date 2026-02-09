import fetch from 'node-fetch';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 10000) {
      return res.status(400).json({ error: 'Message too long (max 10000 characters)' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: message }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
              }
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.json({ reply: data.candidates[0].content.parts[0].text });
        }

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`Rate limit hit (attempt ${attempt + 1}/${maxRetries}). Waiting ${waitTime}ms...`);
          
          if (attempt < maxRetries - 1) {
            await sleep(waitTime);
            continue;
          }
          
          return res.status(429).json({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            retryAfter: 60 
          });
        }

        console.error('Gemini API error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });

        return res.status(response.status).json({ 
          error: data?.error?.message || 'AI service error',
          details: process.env.NODE_ENV === 'development' ? data : undefined
        });

      } catch (fetchError) {
        lastError = fetchError;
        console.error(`Fetch attempt ${attempt + 1} failed:`, fetchError.message);
        
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response. Please try again.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
