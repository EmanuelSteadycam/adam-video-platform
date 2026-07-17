export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const nasUrl = process.env.NAS_URL;
  const nasSecret = process.env.NAS_SECRET;
  if (!nasUrl) return res.status(503).json({ error: 'NAS non configurato.' });

  const { youtubeUrl, codice, title, tema, natura } = req.body || {};
  if (!youtubeUrl || !codice || !tema || !natura) {
    return res.status(400).json({ error: 'Campi obbligatori: youtubeUrl, codice, tema, natura.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 115000);
  try {
    const nasRes = await fetch(`${nasUrl}/save-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(nasSecret ? { Authorization: `Bearer ${nasSecret}` } : {}),
      },
      body: JSON.stringify({ youtubeUrl, codice, title, tema, natura }),
      signal: controller.signal,
    });
    const contentType = nasRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'Il video non è stato salvato — qualcosa si è addormentato dall\'altra parte. Riprova più tardi.' });
    }
    const data = await nasRes.json();
    return res.status(nasRes.ok ? 200 : nasRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  } finally {
    clearTimeout(timeout);
  }
}
