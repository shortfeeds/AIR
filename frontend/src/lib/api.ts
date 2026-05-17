const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // If running on local/VPS dev ports, point to backend port 4000
    if (port === '3000') {
      return `${protocol}//${host}:4000/api`;
    }
  }
  return 'http://localhost:4000/api';
};

const API_BASE = getApiBase();

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
