// BrokerMind API client.
//
// Mirrors the surface of the legacy SDK that the codebase was written against:
//   brokermind.entities.X.list(sort, limit)
//   brokermind.entities.X.filter(where, sort)
//   brokermind.entities.X.get(id)
//   brokermind.entities.X.create(data)
//   brokermind.entities.X.update(id, data)
//   brokermind.entities.X.delete(id)
//   brokermind.functions.invoke(name, payload)
//   brokermind.integrations.Core.InvokeLLM({ prompt, response_json_schema })
//   brokermind.auth.me() / .logout() / .redirectToLogin()
//
// All requests go to the NestJS backend under VITE_API_BASE_URL (defaults to
// "/api"). Vite proxies "/api" to the local backend in dev (see vite.config.js).

// In production set VITE_API_BASE_URL to your Railway backend URL, e.g.
// https://brokermind-backend.up.railway.app/api
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request(method, path, { body, query } = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString().replace(window.location.origin, ''), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function toArray(r) {
  return Array.isArray(r) ? r : [];
}

function makeEntity(name) {
  return {
    list: (sort, limit) =>
      request('GET', `/entities/${name}`, { query: { sort, limit } }).then(toArray),
    filter: (where, sort, limit) =>
      request('POST', `/entities/${name}/query`, { body: where || {}, query: { sort, limit } }).then(toArray),
    get: (id) => request('GET', `/entities/${name}/${id}`),
    create: (data) => request('POST', `/entities/${name}`, { body: data }),
    update: (id, data) => request('PATCH', `/entities/${name}/${id}`, { body: data }),
    delete: (id) => request('DELETE', `/entities/${name}/${id}`),
  };
}

const ENTITY_NAMES = [
  'Client',
  'CallRecording',
  'Conversation',
  'Email',
  'Escalation',
  'FAQ',
  'Margin',
  'Orders',
  'PerformedAction',
  'Portfolio',
  'SupportQuery',
  'Ticket',
  'AISOPSuggestion',
];

const entities = ENTITY_NAMES.reduce((acc, n) => {
  acc[n] = makeEntity(n);
  return acc;
}, {});

const functions = {
  invoke: (name, payload) => request('POST', `/functions/${name}`, { body: payload || {} }),
};

const integrations = {
  Core: {
    InvokeLLM: ({ prompt, response_json_schema, model } = {}) =>
      request('POST', `/llm/invoke`, { body: { prompt, response_json_schema, model } }),
  },
};

const auth = {
  me: () => request('GET', `/auth/me`),
  logout: () => Promise.resolve(),
  redirectToLogin: () => Promise.resolve(),
};

export const brokermind = { entities, functions, integrations, auth };
