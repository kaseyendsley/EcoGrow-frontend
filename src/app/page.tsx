"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  API,
  BACKEND_URL,
  type FeedActivityItem,
  type FeedResponse,
  getAuthToken,
  listMyUserQuests,
  type UserQuest,
} from "@/lib/api";

type Scope = "all" | "subscribed";

export default function HomePage() {
  const router = useRouter();

  // --- Auth guard ---
  useEffect(() => {
    const token = getAuthToken();
    if (!token) router.replace("/login");
  }, [router]);

  const [scope, setScope] = useState<Scope>("subscribed");
  const [limit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [items, setItems] = useState<FeedActivityItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  // For “already taken” checks (same approach as quests/page.tsx)
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => setHasToken(!!getAuthToken()), []);

  const { data: myUserQuests = [] } = useQuery<UserQuest[]>({
    queryKey: ["my-user-quests"],
    queryFn: listMyUserQuests,
    enabled: hasToken,
  });

  const inProgressSet = useMemo(
    () => new Set(myUserQuests.filter((u) => !u.completed).map((u) => u.quest.id)),
    [myUserQuests]
  );

  // Current user (for greeting)
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: API.me,
    enabled: hasToken,
  });

  // Reset paging when scope changes
  useEffect(() => {
    setOffset(0);
    setItems([]);
    setTotal(0);
  }, [scope]);

  const { data, isLoading, isFetching, isError, error } = useQuery<FeedResponse>({
    queryKey: ["feed", scope, limit, offset],
    queryFn: () => API.listFeed({ scope, limit, offset }),
    staleTime: 15_000,
  });

  // Accumulate pages
  useEffect(() => {
    if (!data) return;
    if (offset === 0) setItems(data.results);
    else setItems((prev) => [...prev, ...data.results]);
    setTotal(data.count);
  }, [data, offset]);

  const canLoadMore = useMemo(() => items.length < total, [items.length, total]);

  const onToggle = (next: Scope) => {
    if (next === scope) return;
    setScope(next);
  };

  const onLoadMore = () => {
    if (!canLoadMore || isFetching) return;
    setOffset((prev) => prev + limit);
  };

  const username = me?.username;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {username ? `Welcome, ${username}!` : "Welcome back!"}
        </h1>

        {/* Scope toggle */}
        <div className="inline-flex rounded-2xl border bg-white shadow-sm overflow-hidden">
          <button
            className={`px-4 py-2 text-sm transition ${
              scope === "subscribed" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => onToggle("subscribed")}
          >
            Subscribed Activity
          </button>
          <button
            className={`px-4 py-2 text-sm transition ${
              scope === "all" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => onToggle("all")}
          >
            All Activity
          </button>
        </div>
      </div>

      {/* Loading / error / empty states */}
      {isError && (
        <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(error as Error)?.message || "Error loading feed."}
        </div>
      )}

      {items.length === 0 && (isLoading || isFetching) && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {items.length === 0 && !isLoading && !isFetching && !isError && (
        <div className="my-10 rounded-2xl border p-6 text-center text-sm text-gray-600">
          No recent activity{scope === "subscribed" ? " from your subscriptions" : ""} yet.
        </div>
      )}

      {/* Feed list */}
      <ul className="space-y-4">
        {items.map((it, idx) => (
          <li key={`${it.type}-${idx}`}>
            <ActivityCard
              item={it}
              hasToken={hasToken}
              inProgressSet={inProgressSet}
            />
          </li>
        ))}
      </ul>

      {/* Pager */}
      {items.length > 0 && (
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={onLoadMore}
            disabled={!canLoadMore || isFetching}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetching ? "Loading…" : canLoadMore ? "Load more" : "All caught up"}
          </button>
        </div>
      )}
    </main>
  );
}

function ActivityCard({
  item,
  hasToken,
  inProgressSet,
}: {
  item: FeedActivityItem;
  hasToken: boolean;
  inProgressSet: Set<number>;
}) {
  // helper for absolute URLs (for photos)
  const abs = (u?: string | null) => (!u ? null : u.startsWith("http") ? u : `${BACKEND_URL}${u}`);

  if (item.type === "quest_created") {
    const q = item.quest;
    const canUndertake = hasToken && !inProgressSet.has(q.id);
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <Header user={item.user} ts={item.ts} label="created a quest" />
        <div className="mt-3">
          <QuestMiniCard
            title={q.title}
            description={q.description}
            iconUrl={q.icon.icon_url}
            category={q.category.name}
            difficulty={q.difficulty.name}
            tags={q.tags.map((t) => t.name)}
            questId={q.id}
            canUndertake={canUndertake}
          />
        </div>
      </div>
    );
  }

  // userquest_completed
  const uq = item.user_quest;
  const q = uq.quest;
  const photoUrl = abs(uq.photo);
  const canUndertake = hasToken && !inProgressSet.has(q.id);

  // --- Lightbox state for photo ---
  const [showModal, setShowModal] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModal]);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <Header user={item.user} ts={item.ts} label="completed a quest" />
      <div className="mt-3 flex gap-4">
        {photoUrl ? (
          <>
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="completion"
              className="h-24 w-24 rounded-xl object-cover cursor-pointer"
              onClick={() => setShowModal(true)}
            />
            {/* Modal */}
            {showModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                onClick={() => setShowModal(false)}
              >
                {/* Stop click-through on the image itself */}
                <div onClick={(e) => e.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt="completion large"
                    className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-24 w-24 flex-none rounded-xl bg-gray-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium">{q.title}</div>
          <div className="text-sm text-gray-600 line-clamp-2">{uq.reflection}</div>
          <div className="mt-1 text-xs text-gray-500">
            {q.category.name} • {q.difficulty.name} • {uq.rating ? `★ ${uq.rating}` : "No rating"}
          </div>
          <div className="mt-2">
            <UndertakeButton questId={q.id} canUndertake={canUndertake} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  user,
  ts,
  label,
}: {
  user: { id: number; username: string; profile_img: string | null };
  ts: string;
  label: string;
}) {
  const date = new Date(ts);
  const time = isNaN(date.getTime()) ? ts : date.toLocaleString();
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          user.profile_img ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.username)}`
        }
        alt={user.username}
        className="h-8 w-8 rounded-full object-cover"
      />
      <div className="min-w-0">
        <div className="truncate text-sm">
          <a href={`/users/${user.id}`} className="font-medium hover:underline">
            {user.username}
          </a>{" "}
          <span className="text-gray-600">{label}</span>
        </div>
        <div className="text-xs text-gray-500">{time}</div>
      </div>
    </div>
  );
}

function QuestMiniCard(props: {
  title: string;
  description: string;
  iconUrl: string;
  category: string;
  difficulty: string;
  tags: string[];
  questId: number;
  canUndertake: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={props.iconUrl} alt="" className="h-10 w-10 rounded-lg bg-gray-100 p-1" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{props.title}</div>
        <div className="text-sm text-gray-600 line-clamp-2">{props.description}</div>
        <div className="mt-1 text-xs text-gray-500">
          {props.category} • {props.difficulty}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {props.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2">
          <UndertakeButton questId={props.questId} canUndertake={props.canUndertake} />
        </div>
      </div>
    </div>
  );
}

// /Undertake CTA: shows friendly disabled state if already in progress


function UndertakeButton({ questId, canUndertake }: { questId: number; canUndertake: boolean }) {
  const [taken, setTaken] = useState(!canUndertake);

  if (taken) {
    return (
      <span
        className="inline-block rounded-full bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600"
      >
        You&apos;re already on this Quest!
      </span>
    );
  }

  const onClick = async () => {
    try {
      await API.adoptUserQuest(questId);
      setTaken(true); // switch to friendly message
    } catch (e) {
      console.error(e);
      alert("Couldn't undertake quest. Try again?");
    }
  };

  return (
    <button
      onClick={onClick}
      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
    >
      Undertake Quest
    </button>
  );
}
