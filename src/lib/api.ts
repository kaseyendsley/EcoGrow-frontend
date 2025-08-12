// src/lib/api.ts
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "EG_TOKEN"; 

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

export async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  // Build a Headers object so we can safely merge any HeadersInit type
  const headers = new Headers(options?.headers ?? {});
  headers.set("Content-Type", "application/json");

  // Merge auth header (if present)
  const auth = authHeaders();
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v as string));

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  // 204 has no body
  return (res.status === 204 ? (null as T) : res.json()) as Promise<T>;
}


// ===== Types =====
export type Category = { id: number; name: string };
export type Icon = { id: number; name: string; icon_url: string };
export type Difficulty = { id: number; name: string };
export type Tag = { id: number; name: string };

export type Quest = {
  id: number;
  title: string;
  description: string;
  is_custom: boolean;
  category: Category;
  icon: Icon;
  difficulty: Difficulty;
  tags: Tag[];
  created_by: number;
};

export type QuestPatchBody = {
  title?: string;
  description?: string;
  is_custom?: boolean;
  category_id?: number;
  icon_id?: number;
  difficulty_id?: number;
  tag_ids?: number[];
};

export type Me = {
  id: number;
  username: string;
  email: string;
  profile_img?: string | null;
  date_joined?: string;
};

export type QuestCreateBody = {
  title: string;
  description: string;
  category_id: number;
  icon_id: number;
  difficulty_id: number;
  is_custom?: boolean;
  tag_ids?: number[]; // optional, up to 3 on the UI
};

// ===== API surface =====
export const API = {
  me: () => fetchJSON<Me>("/api/auth/me/"),
  listQuests: () => fetchJSON<Quest[]>("/api/quests/"),
  listCategories: () => fetchJSON<Category[]>("/api/categories/"),
  listIcons: () => fetchJSON<Icon[]>("/api/icons/"),
  listDifficulties: () => fetchJSON<Difficulty[]>("/api/difficulties/"),
  listTags: () => fetchJSON<Tag[]>("/api/tags/"),
  patchQuest: (id: number, body: Partial<QuestPatchBody>) =>
    fetchJSON<Quest>(`/api/quests/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteQuest: (id: number) =>
    fetchJSON<void>(`/api/quests/${id}/`, { method: "DELETE" }),
    createQuest: (body: QuestCreateBody) =>
    fetchJSON<Quest>("/api/quests/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
