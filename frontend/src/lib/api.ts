const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function api(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tp_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export function setToken(token: string) {
  localStorage.setItem('tp_token', token);
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('tp_token') : null;
}

export function removeToken() {
  localStorage.removeItem('tp_token');
}
