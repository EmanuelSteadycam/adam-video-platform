// Send Email Hook di Supabase Auth: tutte le mail di autenticazione (conferma
// iscrizione, reset password, cambio email…) passano da qui invece che dal
// mailer interno di Supabase, e partono via API transazionale Brevo (dominio
// centrosteadycam.it già verificato). Scelto al posto dell'SMTP custom perché
// su Brevo la generazione di chiavi SMTP falliva, e le chiavi SMTP scadono
// dopo 90 giorni di inattività.
//
// Alla conferma di una nuova iscrizione manda anche una notifica all'admin
// (ADMIN_NOTIFY_EMAIL) con nome/organizzazione presi dai metadati passati da
// handleRegister.
//
// La richiesta è firmata secondo lo standard "Standard Webhooks": serve il body
// grezzo per verificare la firma, quindi il bodyParser è disattivato (come in
// transcribe.js).

import crypto from 'node:crypto';

export const config = {
  maxDuration: 30,
  api: { bodyParser: false },
};

// Stesso mittente/risposta del sito centrosteadycam (sezione Display), già in uso su Brevo.
const SENDER = { name: 'ADAM', email: 'info@centrosteadycam.it' };
const REPLY_TO = { name: 'Centro Steadycam', email: 'steadycam01@gmail.com' };
const SIGNATURE_TOLERANCE_SEC = 5 * 60;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function verifySignature(rawBody, headers, secretSetting) {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatureHeader = headers['webhook-signature'];
  if (!id || !timestamp || !signatureHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SEC) return false;

  const secret = Buffer.from(secretSetting.replace(/^v1,whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', secret).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  const expectedBuf = Buffer.from(expected);
  // L'header può contenere più firme separate da spazio, ognuna "v1,<base64>".
  return signatureHeader.split(' ').some((part) => {
    const sig = part.split(',')[1];
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

function buildVerifyUrl(emailData, tokenHash) {
  const params = new URLSearchParams({
    token: tokenHash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to || emailData.site_url || 'https://adam.centrosteadycam.it',
  });
  return `${process.env.VITE_SUPABASE_URL}/auth/v1/verify?${params}`;
}

const layout = (title, bodyHtml) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
    <p style="font-size:13px;letter-spacing:2px;color:#71717a;margin:0 0 16px">ADAM — ARCHIVIO DIGITALE ADDICTION E MEDIA</p>
    <h2 style="margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="font-size:12px;color:#a1a1aa;margin-top:32px">Se non hai richiesto tu questa email, puoi ignorarla.</p>
  </div>`;

const button = (url, label) => `
  <p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#FFDA2A;color:#000;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;display:inline-block">${label}</a></p>
  <p style="font-size:12px;color:#71717a">Se il pulsante non funziona, copia questo link nel browser:<br>${escapeHtml(url)}</p>`;

function buildUserEmail(user, emailData) {
  const nome = user.user_metadata?.nome;
  const greeting = `<p>Ciao${nome ? ` ${escapeHtml(nome)}` : ''},</p>`;
  const type = emailData.email_action_type;

  switch (type) {
    case 'signup': {
      const url = buildVerifyUrl(emailData, emailData.token_hash);
      return {
        subject: 'Conferma la tua iscrizione ad ADAM',
        html: layout('Conferma la tua iscrizione', `${greeting}<p>grazie per esserti iscritto/a ad ADAM. Per attivare l'account conferma il tuo indirizzo email:</p>${button(url, 'Conferma email')}`),
      };
    }
    case 'recovery': {
      const url = buildVerifyUrl(emailData, emailData.token_hash);
      return {
        subject: 'Reimposta la password di ADAM',
        html: layout('Reimposta la password', `${greeting}<p>abbiamo ricevuto una richiesta di reimpostazione della password.</p>${button(url, 'Reimposta password')}`),
      };
    }
    case 'magiclink': {
      const url = buildVerifyUrl(emailData, emailData.token_hash);
      return {
        subject: 'Il tuo link di accesso ad ADAM',
        html: layout('Accedi ad ADAM', `${greeting}${button(url, 'Accedi')}`),
      };
    }
    case 'invite': {
      const url = buildVerifyUrl(emailData, emailData.token_hash);
      return {
        subject: 'Sei stato invitato su ADAM',
        html: layout('Invito ad ADAM', `${greeting}<p>sei stato invitato ad accedere ad ADAM.</p>${button(url, 'Accetta invito')}`),
      };
    }
    case 'email_change': {
      // ADAM oggi non offre il cambio email: caso coperto solo per completezza,
      // il comportamento con "secure email change" (doppio link) non è verificato.
      const url = buildVerifyUrl(emailData, emailData.token_hash_new || emailData.token_hash);
      return {
        subject: 'Conferma il cambio di email su ADAM',
        html: layout('Conferma il nuovo indirizzo', `${greeting}${button(url, 'Conferma cambio email')}`),
      };
    }
    case 'reauthentication':
      return {
        subject: 'Codice di verifica ADAM',
        html: layout('Codice di verifica', `${greeting}<p>il tuo codice è: <b style="font-size:20px;letter-spacing:3px">${escapeHtml(emailData.token)}</b></p>`),
      };
    default:
      // Notifiche informative (password cambiata, email cambiata, ecc.)
      return {
        subject: 'Aggiornamento del tuo account ADAM',
        html: layout('Aggiornamento account', `${greeting}<p>ti confermiamo una modifica al tuo account ADAM (${escapeHtml(type)}). Se non l'hai fatta tu, contattaci.</p>`),
      };
  }
}

async function sendBrevo({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: SENDER, replyTo: REPLY_TO, to: [{ email: to }], subject, htmlContent: html }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo HTTP ${res.status} ${detail}`.trim());
  }
}

async function notifyAdmin(user) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const nome = user.user_metadata?.nome || '—';
  const org = user.user_metadata?.organizzazione || '—';
  const when = new Date(user.created_at || Date.now()).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  await sendBrevo({
    to,
    subject: `Nuovo iscritto ADAM: ${nome !== '—' ? nome : user.email}`,
    html: `
      <p>Nuova iscrizione ad ADAM:</p>
      <ul>
        <li><b>Nome:</b> ${escapeHtml(nome)}</li>
        <li><b>Organizzazione:</b> ${escapeHtml(org)}</li>
        <li><b>Email:</b> ${escapeHtml(user.email)}</li>
        <li><b>Data:</b> ${escapeHtml(when)}</li>
      </ul>
      <p>L'account sarà attivo quando l'utente conferma la sua email.<br>
      Gestione utenti: <a href="https://adam.centrosteadycam.it">adam.centrosteadycam.it</a> → Admin → Utenti</p>`,
  });
}

// Errore nel formato che Supabase Auth mostra all'utente.
const hookError = (res, status, message) => res.status(status).json({ error: { http_code: status, message } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const secretSetting = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secretSetting || !process.env.BREVO_API_KEY || !process.env.VITE_SUPABASE_URL) {
    return hookError(res, 500, 'Invio email non configurato');
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!verifySignature(rawBody, req.headers, secretSetting)) {
    return hookError(res, 401, 'Firma non valida');
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return hookError(res, 400, 'Payload non valido'); }
  const { user, email_data: emailData } = payload;
  if (!user?.email || !emailData?.email_action_type) return hookError(res, 400, 'Payload incompleto');

  try {
    const { subject, html } = buildUserEmail(user, emailData);
    await sendBrevo({ to: user.email, subject, html });
  } catch (e) {
    console.error('auth-email-hook: invio all\'utente fallito', e);
    return hookError(res, 500, 'Invio email non riuscito, riprova tra poco');
  }

  if (emailData.email_action_type === 'signup') {
    // La notifica all'admin non deve mai bloccare l'iscrizione.
    try { await notifyAdmin(user); } catch (e) { console.error('auth-email-hook: notifica admin fallita', e); }
  }

  return res.status(200).json({});
}
