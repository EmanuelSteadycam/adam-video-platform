import { handleUpload } from '@vercel/blob/client';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/*', 'audio/*', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
        maximumSizeInBytes: 500 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
