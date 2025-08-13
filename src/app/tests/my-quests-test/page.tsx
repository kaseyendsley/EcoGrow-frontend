"use client";

import { useState } from "react";
import {
  listMyUserQuests,
  adoptUserQuest,
  completeUserQuest,
  deleteUserQuest,
  UserQuestCompleteBody,
} from "@/lib/api";

export default function MyQuestsTestPage() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  // inputs
  const [adoptQuestId, setAdoptQuestId] = useState<string>("1");
  const [userQuestId, setUserQuestId] = useState<string>("");
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState<string>("4.5");
  const [photoUrl, setPhotoUrl] = useState("");
  const [completedAt, setCompletedAt] = useState(""); // optional ISO

  async function run<T>(fn: () => Promise<T>) {
    setErr(null);
    setOut(null);
    try {
      const res = await fn();
      setOut(res);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">UserQuests API Test</h1>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">1) List My UserQuests</h2>
        <button
          className="px-3 py-2 rounded bg-emerald-600 text-white"
          onClick={() => run(() => listMyUserQuests())}
        >
          GET /api/user-quests/
        </button>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">2) Adopt (create in-progress)</h2>
        <label className="block">
          <span className="text-sm text-gray-600">Quest ID</span>
          <input
            className="border rounded px-3 py-2 w-40"
            value={adoptQuestId}
            onChange={(e) => setAdoptQuestId(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          className="px-3 py-2 rounded bg-emerald-600 text-white"
          onClick={() => run(() => adoptUserQuest(Number(adoptQuestId)))}
        >
          POST /api/user-quests/
        </button>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">3) Complete</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-gray-600">UserQuest ID</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={userQuestId}
              onChange={(e) => setUserQuestId(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 7"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Rating (1–5, half steps)</span>
            <input
              type="number"
              step="0.5"
              min="1"
              max="5"
              className="border rounded px-3 py-2 w-full"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-gray-600">Reflection *</span>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What did you learn/feel?"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Photo URL (optional)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Completed At (optional ISO)</span>
          <input
            className="border rounded px-3 py-2 w-full"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            placeholder="2025-08-13T10:30:00-05:00"
          />
        </label>
        <button
          className="px-3 py-2 rounded bg-emerald-600 text-white"
          onClick={() =>
            run(() =>
              completeUserQuest(Number(userQuestId), {
                reflection: reflection.trim(),
                rating: Number(rating),
                photo_url: photoUrl.trim() || undefined,
                completed_at: completedAt.trim() || undefined,
              } as UserQuestCompleteBody)
            )
          }
        >
          POST /api/user-quests/:id/complete/
        </button>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">4) Cancel (delete in-progress)</h2>
        <label className="block">
          <span className="text-sm text-gray-600">UserQuest ID</span>
          <input
            className="border rounded px-3 py-2 w-40"
            value={userQuestId}
            onChange={(e) => setUserQuestId(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          className="px-3 py-2 rounded bg-red-600 text-white"
          onClick={() => run(() => deleteUserQuest(Number(userQuestId)))}
        >
          DELETE /api/user-quests/:id/
        </button>
      </div>

      {(err || out) && (
        <section className="rounded-xl border p-3 bg-white">
          <h3 className="font-medium">Result</h3>
          {err ? (
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{err}</pre>
          ) : (
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(out, null, 2)}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}
