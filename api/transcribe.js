import formidable from 'formidable';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegPath from 'ffmpeg-static';

export const config = {
  maxDuration: 120,
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY non configurata.' });
  }

  const form = formidable({ maxFileSize: 200 * 1024 * 1024 }); // 200MB
  let [, files] = await form.parse(req).catch(e => { throw new Error(`Upload fallito: ${e.message}`); });

  const uploaded = files.file?.[0] || files.video?.[0] || files.audio?.[0];
  if (!uploaded) return res.status(400).json({ error: 'Nessun file ricevuto.' });

  const audioPath = join(tmpdir(), `adam-${Date.now()}.mp3`);

  try {
    // estrai audio mono 16kHz — ottimale per Whisper, file piccolo
    execSync(
      `"${ffmpegPath}" -i "${uploaded.filepath}" -vn -acodec libmp3lame -q:a 7 -ac 1 -ar 16000 "${audioPath}" -y`,
      { timeout: 90000 }
    );

    const audioBuffer = readFileSync(audioPath);
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'it');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}));
      return res.status(500).json({ error: `Errore Whisper: ${err.error?.message || whisperRes.status}` });
    }

    const data = await whisperRes.json();
    return res.status(200).json({ transcript: data.text?.trim() || '' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  } finally {
    if (existsSync(audioPath)) unlinkSync(audioPath);
  }
}
