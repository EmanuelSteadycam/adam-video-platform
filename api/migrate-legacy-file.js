export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const nasUrl = process.env.NAS_URL;
  const nasSecret = process.env.NAS_SECRET;
  if (!nasUrl) return res.status(503).json({ error: 'NAS non configurato.' });

  const { oldRelativePath, tema, natura, codice, title } = req.body || {};
  if (!oldRelativePath || !tema || !natura || !codice) {
    return res.status(400).json({ error: 'Campi obbligatori: oldRelativePath, tema, natura, codice.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const nasRes = await fetch(`${nasUrl}/migrate-legacy-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(nasSecret ? { Authorization: `Bearer ${nasSecret}` } : {}),
      },
      body: JSON.stringify({ oldRelativePath, tema, natura, codice, title }),
      signal: controller.signal,
    });
    const contentType = nasRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'NAS non raggiungibile — potrebbe essere in sospensione, prova a risvegliarlo.' });
    }
    const data = await nasRes.json();
    return res.status(nasRes.ok ? 200 : nasRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  } finally {
    clearTimeout(timeout);
  }
}
