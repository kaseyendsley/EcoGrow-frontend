"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyUserQuests,
  completeUserQuest,
  deleteUserQuest,
  UserQuest,
  UserQuestCompleteBody,
  getAuthToken,
} from "@/lib/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

async function patchUserQuestLocal(
  id: number,
  body: { reflection?: string; rating?: number }
): Promise<UserQuest> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/user-quests/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function MyQuestsPage() {
  const qc = useQueryClient();

  const [hasToken, setHasToken] = useState(false);
  useEffect(() => setHasToken(!!getAuthToken()), []);

  const { data, isLoading, error } = useQuery<UserQuest[]>({
    queryKey: ["my-user-quests"],
    queryFn: listMyUserQuests,
    enabled: hasToken,
  });

  const [tab, setTab] = useState<"inprogress" | "completed">("inprogress");

  const inProgress = useMemo(
    () => (data ?? []).filter((u) => !u.completed),
    [data]
  );
  const completed = useMemo(
    () => (data ?? []).filter((u) => u.completed),
    [data]
  );

  const [completeOpen, setCompleteOpen] = useState(false);
  const [activeUQ, setActiveUQ] = useState<UserQuest | null>(null);

  const completeMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserQuestCompleteBody }) =>
      completeUserQuest(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-user-quests"] });
      setCompleteOpen(false);
      setActiveUQ(null);
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editingUQ, setEditingUQ] = useState<UserQuest | null>(null);

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { reflection?: string; rating?: number } }) =>
      patchUserQuestLocal(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-user-quests"] });
      setEditOpen(false);
      setEditingUQ(null);
    },
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<UserQuest | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUserQuest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-user-quests"] });
      setConfirmOpen(false);
      setToDelete(null);
    },
  });

  if (!hasToken) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">My Quests</h1>
        <div className="rounded-2xl border p-4 bg-white">Log in to see your quests.</div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Quests</h1>
        <div className="inline-flex rounded-xl border bg-white overflow-hidden">
          <button
            onClick={() => setTab("inprogress")}
            className={`px-4 py-2 text-sm ${tab === "inprogress" ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            In Progress ({inProgress.length})
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2 text-sm ${tab === "completed" ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            Completed ({completed.length})
          </button>
        </div>
      </div>

      {isLoading && <div>Loading your quests…</div>}
      {error && <div className="rounded-2xl border p-4 bg-white">Couldn’t load your quests.</div>}

      {!isLoading && !error && (
        <>
          {tab === "inprogress" ? (
            <InProgressList
              items={inProgress}
              onOpenComplete={(u) => {
                setActiveUQ(u);
                setCompleteOpen(true);
              }}
              onOpenCancel={(u) => {
                setToDelete(u);
                setConfirmOpen(true);
              }}
              deletingId={toDelete?.id}
              isDeleting={deleteMut.isPending}
            />
          ) : (
            <CompletedList
              items={completed}
              onOpenEdit={(u) => {
                setEditingUQ(u);
                setEditOpen(true);
              }}
              onOpenDelete={(u) => {
                setToDelete(u);
                setConfirmOpen(true);
              }}
              deletingId={toDelete?.id}
              isDeleting={deleteMut.isPending}
            />
          )}
        </>
      )}

      <CompleteModal
        open={completeOpen}
        onClose={() => {
          if (!completeMut.isPending) {
            setCompleteOpen(false);
            setActiveUQ(null);
          }
        }}
        uq={activeUQ}
        onSubmit={(body) => {
          if (!activeUQ) return;
          completeMut.mutate({ id: activeUQ.id, body });
        }}
        submitting={completeMut.isPending}
        errorMsg={(completeMut.error as any)?.message}
      />

      <EditCompletedModal
        open={editOpen}
        onClose={() => {
          if (!editMut.isPending) {
            setEditOpen(false);
            setEditingUQ(null);
          }
        }}
        uq={editingUQ}
        onSubmit={(body) => {
          if (!editingUQ) return;
          editMut.mutate({ id: editingUQ.id, body });
        }}
        submitting={editMut.isPending}
        errorMsg={(editMut.error as any)?.message}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Remove this quest?"
        body="This will delete the quest from your list."
        confirmText={deleteMut.isPending ? "Deleting…" : "Yes, delete it"}
        cancelText="Nevermind"
        onCancel={() => {
          if (!deleteMut.isPending) {
            setConfirmOpen(false);
            setToDelete(null);
          }
        }}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.id);
        }}
      />
    </main>
  );
}

/* === Lists === */

function InProgressList({
  items,
  onOpenComplete,
  onOpenCancel,
  isDeleting,
  deletingId,
}: {
  items: UserQuest[];
  onOpenComplete: (u: UserQuest) => void;
  onOpenCancel: (u: UserQuest) => void;
  isDeleting: boolean;
  deletingId?: number;
}) {
  if (!items.length) {
    return <div className="rounded-2xl border p-6 text-sm text-gray-600 bg-white">No quests in progress yet.</div>;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((u) => {
        const deleting = isDeleting && deletingId === u.id;
        return (
          <li key={u.id} className="relative rounded-2xl shadow p-4 bg-white space-y-3">
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                className="px-3 py-1 rounded-xl bg-emerald-600 text-white"
                onClick={() => onOpenComplete(u)}
              >
                Complete
              </button>
              <button
                className="px-3 py-1 rounded-xl bg-red-100"
                onClick={() => onOpenCancel(u)}
                disabled={deleting}
                title="Cancel this in-progress quest"
              >
                {deleting ? "Deleting…" : "Cancel"}
              </button>
            </div>

            <div className="flex items-center gap-3 pr-28 md:pr-40">
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
          </li>
        );
      })}
    </ul>
  );
}

function CompletedList({
  items,
  onOpenEdit,
  onOpenDelete,
  isDeleting,
  deletingId,
}: {
  items: UserQuest[];
  onOpenEdit: (u: UserQuest) => void;
  onOpenDelete: (u: UserQuest) => void;
  isDeleting: boolean;
  deletingId?: number;
}) {
  if (!items.length) {
    return <div className="rounded-2xl border p-6 text-sm text-gray-600 bg-white">No completed quests yet.</div>;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((u) => {
        const deleting = isDeleting && deletingId === u.id;
        return (
          <li key={u.id} className="relative rounded-2xl shadow p-4 bg-white space-y-3">
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                className="px-3 py-1 rounded-xl bg-gray-100"
                onClick={() => onOpenEdit(u)}
                title="Edit reflection & rating"
              >
                Edit
              </button>
              <button
                className="px-3 py-1 rounded-xl bg-red-100"
                onClick={() => onOpenDelete(u)}
                disabled={deleting}
                title="Delete this completed quest"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>

            <div className="flex items-center gap-3 pr-28 md:pr-40">
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

            {u.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.photo_url}
                alt="Proof"
                className="w-full max-h-56 object-cover rounded-xl border"
              />
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
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Your reflection
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{u.reflection}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* === Modals === */

function CompleteModal({
  open,
  onClose,
  uq,
  onSubmit,
  submitting,
  errorMsg,
}: {
  open: boolean;
  onClose: () => void;
  uq: UserQuest | null;
  onSubmit: (body: UserQuestCompleteBody) => void;
  submitting: boolean;
  errorMsg?: string;
}) {
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState("4.5");
  const [photoUrl, setPhotoUrl] = useState("");
  const [completedAt, setCompletedAt] = useState("");

  useEffect(() => {
    if (open) {
      setReflection("");
      setRating("4.5");
      setPhotoUrl("");
      setCompletedAt("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !uq) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Complete: <span className="font-normal">{uq.quest?.title}</span>
            </h2>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">
              ✕
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                reflection: reflection.trim(),
                rating: Number(rating),
                photo_url: photoUrl.trim() || undefined,
                completed_at: completedAt.trim() || undefined,
              });
            }}
          >
            <label className="block">
              <span className="text-sm text-gray-600">Reflection *</span>
              <textarea
                className="w-full border rounded-xl px-3 py-2"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-sm text-gray-600">Rating *</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="5"
                  className="w-full border rounded-xl px-3 py-2"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm text-gray-600">Photo URL (optional)</span>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-gray-600">Completed At</span>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                placeholder="2025-08-13T10:30:00-05:00"
              />
            </label>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl bg-gray-100" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white" disabled={submitting}>
                {submitting ? "Submitting…" : "Mark Complete"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditCompletedModal({
  open,
  onClose,
  uq,
  onSubmit,
  submitting,
  errorMsg,
}: {
  open: boolean;
  onClose: () => void;
  uq: UserQuest | null;
  onSubmit: (body: { reflection?: string; rating?: number }) => void;
  submitting: boolean;
  errorMsg?: string;
}) {
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState("4.5");

  useEffect(() => {
    if (open && uq) {
      setReflection(uq.reflection || "");
      setRating(uq.rating != null ? String(uq.rating) : "4.5");
    }
  }, [open, uq]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !uq) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Edit: <span className="font-normal">{uq.quest?.title}</span>
            </h2>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">
              ✕
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                reflection: reflection.trim(),
                rating: Number(rating),
              });
            }}
          >
            <label className="block">
              <span className="text-sm text-gray-600">Reflection *</span>
              <textarea
                className="w-full border rounded-xl px-3 py-2"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Rating *</span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="5"
                className="w-full border rounded-xl px-3 py-2"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                required
              />
            </label>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl bg-gray-100" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white" disabled={submitting}>
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  body,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {body && <p className="text-sm text-gray-600 mb-4">{body}</p>}
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded-xl bg-gray-100" onClick={onCancel}>
              {cancelText}
            </button>
            <button className="px-4 py-2 rounded-xl bg-red-600 text-white" onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
