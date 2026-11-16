// Catch-all for /api/*. Vercel runs this file as one Node function; the local dev server calls the same handler.
import { handle } from './_lib/routes.mjs';

export default async function handler(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/\/+$/, '') || '/';
  return handle(req, res, path);
}
