// src/lib/auth.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ---- token storage (browser only) ----
const TOKEN_KEY = "ecogrow_token";
export const saveToken = (token: string) => {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
};
export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
};

// ---- base fetch helpers ----
async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function authed<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  return api<T>(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: token ? `Token ${token}` : "",
    },
  });
}

// ---- auth API ----
export async function login(username: string, password: string) {
  const data = await api<{ token: string }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveToken(data.token);
  return data.token;
}

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  profile_img?: string;
}) {
  const data = await api<{ token: string; id: number; username: string }>(
    "/api/auth/register/",
    { method: "POST", body: JSON.stringify(payload) }
  );
  saveToken(data.token);
  return data;
}

export async function me() {
  return authed<{
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_img: string | null;
    is_moderator: boolean;
  }>("/api/auth/me/");
}

export async function logout() {
  try {
    await authed("/api/auth/logout/", { method: "POST" });
  } finally {
    clearToken();
  }
}
