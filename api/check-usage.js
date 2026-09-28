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
    // Chiamata minima (1 token di output, costo trascurabile): /v1/models risponde
    // 200 anche a credito esaurito, solo una vera /v1/messages lo rivela.
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
      signal: AbortSignal.timeout(10000),
    });
    const cost = await getAnthropicMonthCost();
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || '';
      if (/credit balance/i.test(msg)) {
        return { status: 'error', creditExhausted: true, detail: 'Credito esaurito — sinossi e ricerca semantica sono ferme. Ricarica su console.anthropic.com → Billing.', ...cost };
      }
      return { status: 'error', detail: `HTTP ${res.status}${msg ? ` — ${msg}` : ''}`, ...cost };
    }
    return { status: 'ok', ...cost };
  } catch (e) { return { status: 'error', detail: e.message }; }
}

// Consumo reale del mese corrente via Cost API (Admin API). Richiede una chiave
// Admin (sk-ant-admin...) separata: la chiave normale viene rifiutata.
// Importi in centesimi USD come stringhe decimali.
async function getAnthropicMonthCost() {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) return { costConfigured: false };
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    let cents = 0;
    let page = null;
    for (let i = 0; i < 5; i++) {
      const params = new URLSearchParams({ starting_at: start.toISOString(), ending_at: end.toISOString(), limit: '31' });
      if (page) params.set('page', page);
      const res = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params}`, {
        headers: { 'x-api-key': adminKey, 'anthropic-version': '2023-06-01' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { costConfigured: true, costError: `HTTP ${res.status}` };
      const data = await res.json();
      for (const bucket of data.data || []) {
        for (const r of bucket.results || []) cents += parseFloat(r.amount) || 0;
      }
      if (!data.has_more || !data.next_page) break;
      page = data.next_page;
    }
    return { costConfigured: true, monthCostUsd: cents / 100, monthStart: start.toISOString() };
  } catch (e) { return { costConfigured: true, costError: e.message }; }
}

async function checkBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { status: 'not_configured' };
  return { status: 'ok' };
}

async function checkApify() {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { status: 'not_configured' };
  try {
    const [meRes, usageRes] = await Promise.all([
      fetch(`https://api.apify.com/v2/users/me?token=${token}`, { signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${token}`, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!meRes.ok) return { status: 'error', detail: `HTTP ${meRes.status}` };
    if (!usageRes.ok) return { status: 'error', detail: `HTTP ${usageRes.status}` };
    const me = (await meRes.json()).data;
    const usage = (await usageRes.json()).data;
    return {
      status: 'ok',
      planTier: me?.plan?.tier ?? null,
      usedUsd: usage?.totalUsageCreditsUsdAfterVolumeDiscount ?? 0,
      limitUsd: me?.plan?.maxMonthlyUsageUsd ?? 0,
      cycleEndsAt: usage?.usageCycle?.endAt ?? null,
    };
  } catch (e) { return { status: 'error', detail: e.message }; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const [scraperapi, groq, anthropic, blob, apify] = await Promise.allSettled([
    checkScraperAPI(),
    checkGroq(),
    checkAnthropic(),
    checkBlob(),
    checkApify(),
  ]);

  return res.status(200).json({
    scraperapi: scraperapi.value ?? { status: 'error' },
    groq: groq.value ?? { status: 'error' },
    anthropic: anthropic.value ?? { status: 'error' },
    blob: blob.value ?? { status: 'error' },
    apify: apify.value ?? { status: 'error' },
    checkedAt: new Date().toISOString(),
  });
}
