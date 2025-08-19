"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getAuthToken,
  me,
  getUserProfile,
  getUserCreatedQuests,
  getUserCompletedUserQuests,
  type UserProfilePublic,
  type Quest,
  type UserQuest,
} from "@/lib/api";

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const userId = useMemo(() => (idParam ? Number(idParam) : NaN), [idParam]);

  // auth presence (only to decide subscribe visibility)
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => setHasToken(!!getAuthToken()), []);

  // current user (if logged in)
  const { data: meUser } = useQuery({
    queryKey: ["me"],
    queryFn: me,
    enabled: hasToken,
  });

  const { data: profile, isLoading, error } = useQuery<UserProfilePublic>({
    queryKey: ["profile.public", userId],
    queryFn: () => getUserProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const { data: created = [], isLoading: createdLoading } = useQuery<Quest[]>({
    queryKey: ["profile.created-quests", userId],
    queryFn: () => getUserCreatedQuests(userId),
    enabled: Number.isFinite(userId),
  });

  const { data: completed = [], isLoading: completedLoading } = useQuery<UserQuest[]>({
    queryKey: ["profile.completed-uq", userId],
    queryFn: () => getUserCompletedUserQuests(userId),
    enabled: Number.isFinite(userId),
  });

  const [tab, setTab] = useState<"created" | "completed">("created");

  const initials = useMemo(() => {
    const ch = (profile?.username ?? "").trim().charAt(0);
    return ch ? ch.toUpperCase() : "?";
  }, [profile?.username]);

  const isOwn = !!meUser && !!profile && meUser.id === profile.id;

  // subscribe stub
  const subscribeMut = useMutation({
    mutationFn: async () => {
      // wire up later
      await new Promise((r) => setTimeout(r, 400));
      return true;
    },
    onSuccess: () => {
      alert("Subscribed! (stub — backend wiring coming next)");
    },
  });

  if (!Number.isFinite(userId)) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border p-4 bg-white">Invalid user id.</div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      {isLoading ? (
        <div>Loading profile…</div>
      ) : error || !profile ? (
        <div className="rounded-2xl border p-4 bg-white">Couldn’t load this profile.</div>
      ) : (
        <section className="relative rounded-2xl bg-white shadow p-6">
          {/* Top-right: Subscribe or (You) */}
          <div className="absolute top-4 right-4">
            {isOwn ? (
              <span className="text-xs text-gray-500"></span>
            ) : (
              <button
                className="px-3 py-1 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
                onClick={() => subscribeMut.mutate()}
                disabled={!hasToken || subscribeMut.isPending}
                title={hasToken ? "Subscribe to this user" : "Log in to subscribe"}
              >
                {subscribeMut.isPending ? "Subscribing…" : "Subscribe"}
              </button>
            )}
          </div>

          <div className="flex items-start gap-6 pr-40">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.profile_img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_img}
                  alt={`${profile.username} avatar`}
                  className="h-24 w-24 rounded-full object-cover border"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-2xl font-semibold border">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold">{profile.username}</h1>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Stat label="Quests Created" value={profile.quests_created_count} />
                <Stat label="User Quests Completed" value={profile.user_quests_completed_count} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Activity toggle */}
      <div className="inline-flex rounded-xl border bg-white overflow-hidden">
        <button
          onClick={() => setTab("created")}
          className={`px-4 py-2 text-sm ${tab === "created" ? "bg-emerald-600 text-white" : "bg-white"}`}
        >
          Created ({created.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-4 py-2 text-sm ${tab === "completed" ? "bg-emerald-600 text-white" : "bg-white"}`}
        >
          Completed ({completed.length})
        </button>
      </div>

      {/* Lists */}
      {tab === "created" ? (
        createdLoading ? (
          <div>Loading created quests…</div>
        ) : (
          <CreatedList items={created} />
        )
      ) : completedLoading ? (
        <div>Loading completed quests…</div>
      ) : (
        <CompletedList items={completed} />
      )}
    </main>
  );
}

/* --- UI bits --- */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function CreatedList({ items }: { items: Quest[] }) {
  if (!items.length) {
    return <div className="rounded-2xl border p-6 text-sm text-gray-600 bg-white">No quests created yet.</div>;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((q) => (
        <li key={q.id} className="rounded-2xl shadow p-4 bg-white space-y-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.icon?.icon_url && <img src={q.icon.icon_url} alt={q.icon.name} className="h-8 w-8" />}
            <div>
              <h2 className="text-lg font-semibold">{q.title}</h2>
              <p className="text-sm text-gray-500">
                {q.category?.name} · {q.difficulty?.name}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700">{q.description}</p>

          {!!q.tags?.length && (
            <div className="flex flex-wrap gap-2">
              {q.tags.map((t) => (
                <span key={t.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {/* You can link to /quests (global list) if you want users to undertake from there */}
          <Link href="/quests" className="text-sm underline">
            Explore quests
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CompletedList({ items }: { items: UserQuest[] }) {
  if (!items.length) {
    return <div className="rounded-2xl border p-6 text-sm text-gray-600 bg-white">No completed quests yet.</div>;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((u) => (
        <li key={u.id} className="rounded-2xl shadow p-4 bg-white space-y-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {u.quest?.icon?.icon_url && (
              <img src={u.quest.icon.icon_url} alt={u.quest.icon.name} className="h-8 w-8" />
            )}
            <div>
              <h2 className="text-lg font-semibold">{u.quest?.title}</h2>
              <p className="text-sm text-gray-500">
                {u.quest?.category?.name} · {u.quest?.difficulty?.name}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700">{u.quest?.description}</p>

          {!!u.quest?.tags?.length && (
            <div className="flex flex-wrap gap-2">
              {u.quest.tags.map((t) => (
                <span key={t.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {u.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.photo} alt="Proof" className="w-full max-h-56 object-cover rounded-xl border" />
          )}

          <div className="text-xs text-gray-500">
            {u.completed_at ? (
              <span>Completed: {new Date(u.completed_at).toLocaleString()}</span>
            ) : (
              <span>Completed</span>
            )}
            {u.rating != null && <span className="ml-2">• Rating: {String(u.rating)}</span>}
          </div>

          {u.reflection && (
            <div className="rounded-xl bg-gray-50 border p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Reflection</div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{u.reflection}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
