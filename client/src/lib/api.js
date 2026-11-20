// Where the API lives.
//
// Normally: nowhere. The server hands out this built client, so a request to
// `/api/themes` already goes to the same host the page came from --
// https://paper-studio.onrender.com in production, the Vite dev server (which
// proxies) locally. Hard-coding the deployed URL would break local
// development and add a CORS round-trip to every call for nothing.
//
// Set VITE_API_BASE only when the client is hosted somewhere else from the
// server -- a static host, or a packaged desktop build -- in which case the
// server also needs that origin allowed in CORS.
//
//   client/.env.production:  VITE_API_BASE=https://paper-studio.onrender.com

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

/** Absolute URL for a server path, or the path itself when same-origin. */
export const apiUrl = (path) => (API_BASE ? API_BASE + path : path);

/** fetch(), pointed at the server. Same arguments otherwise. */
export const apiFetch = (path, init) => fetch(apiUrl(path), init);
