import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return res.status(500).json({ error: 'Missing Resend configuration' });
    }

    const { to, subject, html, text, attachments = [] } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const resend = require('resend').Resend;
    const client = new resend(RESEND_API_KEY);

    const payload = {
      from: RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    };

    const response = await client.emails.send(payload);
    return res.status(200).json({ success: true, id: response.data?.id || null });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Email delivery failed' });
  }
}
