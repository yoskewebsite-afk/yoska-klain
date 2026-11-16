// Entry for every /api/* call. vercel.json rewrites /api/<anything> to /api/index?__p=/api/<anything>, so this one function serves the whole API.
// The local dev server calls the same handler with the original URL.
import { handle } from './_lib/routes.mjs';

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const orig = u.searchParams.get('__p');
  let path = u.pathname;
  if (orig) {
    path = orig;
    u.searchParams.delete('__p');
    req.url = path + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '');
  }
  return handle(req, res, path.replace(/\/+$/, '') || '/');
}
