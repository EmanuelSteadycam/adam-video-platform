export const config = { maxDuration: 30 };

async function checkScraperAPI() {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return { status: 'not_configured' };
  try {
    const res = await fetch(`http://api.scraperapi.com/account?api_key=${key}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { status: 'error', detail: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      status: 'ok',
      requestCount: data.requestCount ?? 0,
      requestLimit: data.requestLimit ?? 0,
      failedRequestCount: data.failedRequestCount ?? 0,
      concurrencyLimit: data.concurrencyLimit ?? 1,
    };
  } catch (e) { return { status: 'error', detail: e.message }; }
}

async function checkGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { status: 'not_configured' };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: 'error', detail: `HTTP ${res.status}` };
    return { status: 'ok' };
  } catch (e) { return { status: 'error', detail: e.message }; }
}

async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { status: 'not_configured' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: 'error', detail: `HTTP ${res.status}` };
    return { status: 'ok' };
  } catch (e) { return { status: 'error', detail: e.message }; }
}

async function checkBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { status: 'not_configured' };
  return { status: 'ok' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const [scraperapi, groq, anthropic, blob] = await Promise.allSettled([
    checkScraperAPI(),
    checkGroq(),
    checkAnthropic(),
    checkBlob(),
  ]);

  return res.status(200).json({
    scraperapi: scraperapi.value ?? { status: 'error' },
    groq: groq.value ?? { status: 'error' },
    anthropic: anthropic.value ?? { status: 'error' },
    blob: blob.value ?? { status: 'error' },
    checkedAt: new Date().toISOString(),
  });
}
