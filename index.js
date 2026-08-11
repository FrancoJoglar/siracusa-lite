// Vercel needs this as entrypoint.
// Static files are served from /public by vercel.json outputDirectory.
// API routes in /api/ are handled separately by Vercel serverless.
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', service: 'siracusa-lite' });
}
