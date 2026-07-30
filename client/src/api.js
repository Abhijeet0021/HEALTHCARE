// Tiny fetch helper so components don't repeat headers/JSON parsing.
async function request(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get:   (url) => request('GET', url),
  post:  (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
};
