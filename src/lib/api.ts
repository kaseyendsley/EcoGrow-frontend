export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "EG_TOKEN";

// Auth Utilities
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

// Generic fetch for JSON APIs (auto-includes auth)
export async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers ?? {});
  headers.set("Content-Type", "application/json");
  Object.entries(authHeaders()).forEach(([k, v]) => headers.set(k, v as string));

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return (res.status === 204 ? (null as T) : res.json()) as Promise<T>;
}

// Generic fetch for FormData APIs (auto-includes auth, omits Content-Type)
async function fetchForm<T>(path: string, form: FormData, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...authHeaders() }; // Don't set Content-Type!
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    method: options?.method || "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Types 
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
  tag_ids?: number[];
};

export type UserQuest = {
  id: number;
  quest: Quest;
  completed: boolean;
  completed_at: string | null;
  reflection: string;
  rating: number | string | null;
  photo?: string | null; 
};

export type UserQuestCompleteBody = {
  reflection: string;
  rating: number;
  completed_at?: string;
};

export type UserProfilePublic = {
  id: number;
  username: string;
  profile_img: string | null;
  quests_created_count: number;
  user_quests_completed_count: number;
};

export type UserProfileOwn = UserProfilePublic & {
  email: string;
};

export type Subscription = {
  id: number;
  created_at: string; // ISO
  target: { id: number; username: string };
};

export type UserMini = {
  id: number;
  username: string;
  profile_img: string | null;
};

export type FeedActivityItem =
  | {
      type: "quest_created";
      ts: string;               // ISO
      user: UserMini;
      quest: Quest;             // reuse your Quest type
    }
  | {
      type: "userquest_completed";
      ts: string;               // ISO
      user: UserMini;
      user_quest: UserQuest;    // reuse your UserQuest type
    };

export type FeedResponse = {
  results: FeedActivityItem[];
  count: number;
};

// API surface 
export const API = {
  // Auth & user
  me: () => fetchJSON<Me>("/api/auth/me/"),

  // Profiles
  getUserProfile: (id: number) => fetchJSON<UserProfilePublic>(`/api/users/${id}/`),
  getMyProfile: () => fetchJSON<UserProfileOwn>("/api/users/me/"),

  // Profile activity (NEW)
  getUserCreatedQuests: (id: number) =>
    fetchJSON<Quest[]>(`/api/users/${id}/created-quests/`),
  getUserCompletedUserQuests: (id: number) =>
    fetchJSON<UserQuest[]>(`/api/users/${id}/completed-user-quests/`),

  // Quests
  listQuests: () => fetchJSON<Quest[]>("/api/quests/"),
  createQuest: (body: QuestCreateBody) =>
    fetchJSON<Quest>("/api/quests/", { method: "POST", body: JSON.stringify(body) }),
  patchQuest: (id: number, body: Partial<QuestPatchBody>) =>
    fetchJSON<Quest>(`/api/quests/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteQuest: (id: number) =>
    fetchJSON<void>(`/api/quests/${id}/`, { method: "DELETE" }),

  // Metadata
  listCategories: () => fetchJSON<Category[]>("/api/categories/"),
  listIcons: () => fetchJSON<Icon[]>("/api/icons/"),
  listDifficulties: () => fetchJSON<Difficulty[]>("/api/difficulties/"),
  listTags: () => fetchJSON<Tag[]>("/api/tags/"),

  // UserQuests
  listMyUserQuests: () => fetchJSON<UserQuest[]>("/api/user-quests/"),
  adoptUserQuest: (quest_id: number) =>
    fetchJSON<UserQuest>("/api/user-quests/", {
      method: "POST",
      body: JSON.stringify({ quest_id }),
    }),
  completeUserQuest: (id: number, body: UserQuestCompleteBody) =>
    fetchJSON<UserQuest>(`/api/user-quests/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteUserQuest: (id: number) =>
    fetchJSON<void>(`/api/user-quests/${id}/`, { method: "DELETE" }),

  // UserQuest with file upload (reflection, rating, photo, completed_at)
  completeUserQuestUpload: (
    id: number,
    payload: { reflection: string; rating: number; photo: File; completed_at?: string }
  ) => {
    const form = new FormData();
    form.append("reflection", payload.reflection);
    form.append("rating", String(payload.rating));
    form.append("photo", payload.photo);
    if (payload.completed_at) form.append("completed_at", payload.completed_at);
    return fetchForm<UserQuest>(`/api/user-quests/${id}/complete/`, form);
  },

  // Subscriptions
  listSubscriptions: () => fetchJSON<Subscription[]>("/api/subscriptions/"),
  createSubscription: (target_id: number) =>
    fetchJSON<Subscription>("/api/subscriptions/", {
      method: "POST",
      body: JSON.stringify({ target_id }),
    }),
  deleteSubscription: (subscriptionId: number) =>
    fetchJSON<void>(`/api/subscriptions/${subscriptionId}/`, {
      method: "DELETE",
    }),

    // Feed
  listFeed: ({
    scope,
    limit = 20,
    offset = 0,
  }: {
    scope: "all" | "subscribed";
    limit?: number;
    offset?: number;
  }) =>
    fetchJSON<FeedResponse>(
      `/api/feed/?scope=${encodeURIComponent(scope)}&limit=${limit}&offset=${offset}`
    ),


};

// Optionally, export API methods individually if needed 
export const {
  me,
  // profiles
  getUserProfile,
  getMyProfile,
  getUserCreatedQuests,
  getUserCompletedUserQuests,
  // quests
  listQuests,
  createQuest,
  patchQuest,
  deleteQuest,
  // metadata
  listCategories,
  listIcons,
  listDifficulties,
  listTags,
  // user quests
  listMyUserQuests,
  adoptUserQuest,
  completeUserQuest,
  deleteUserQuest,
  completeUserQuestUpload,
  // subscriptions
  listSubscriptions,
  createSubscription,
  deleteSubscription,
    // feed
    listFeed,
} = API;
