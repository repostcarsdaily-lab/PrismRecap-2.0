import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { default: fetch } = globalThis;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GROQ_API_KEY' });
    return;
  }

  const { transcript } = req.body || {};
  if (!transcript) {
    res.status(400).json({ error: 'Transcript is required' });
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}` ,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert executive assistant. Return a structured response with headings and bullet points for Executive Summary, Key Highlights, Decisions Made, Action Items, Assignees, Deadlines, Risks, Open Questions, and Next Steps.',
          },
          {
            role: 'user',
            content: `Analyze this meeting transcript and provide the requested sections.\n\n${transcript}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq request failed');
    }

    res.status(200).json({ content: data.choices?.[0]?.message?.content || '' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
