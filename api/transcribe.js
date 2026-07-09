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

  const file = req.file || null;
  if (!file) {
    res.status(400).json({ error: 'Audio file is required' });
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: file,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Transcription failed');
    }

    res.status(200).json({ text: data.text || '' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
