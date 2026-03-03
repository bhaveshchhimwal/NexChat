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

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    if (response.ok && data?.choices?.[0]?.message?.content) {
      return res.json({ reply: data.choices[0].message.content });
    }

    return res.status(response.status).json({ error: data?.error?.message || 'AI service error' });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate AI response. Please try again.' });
  }
};