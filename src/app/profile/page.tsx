"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BACKEND_URL,
  getAuthToken,
  fetchJSON,
  type UserProfileOwn,
} from "@/lib/api";

/** PATCH /api/users/me/ (username/email) */
async function patchOwnProfile(body: { username?: string; email?: string }): Promise<UserProfileOwn> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/users/me/`, {
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

/** DELETE /api/users/me/ */
async function deleteOwnAccount(): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/users/me/`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();

  // Keep hook order stable
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => setHasToken(!!getAuthToken()), []);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile.me"],
    queryFn: () => fetchJSON<UserProfileOwn>("/api/users/me/"),
    enabled: hasToken,
  });

  const initials = useMemo(() => {
    const ch = (profile?.username ?? "").trim().charAt(0);
    return ch ? ch.toUpperCase() : "?";
  }, [profile?.username]);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    if (editOpen && profile) {
      setEditUsername(profile.username || "");
      setEditEmail(profile.email || "");
    }
  }, [editOpen, profile]);

  const editMut = useMutation({
    mutationFn: ({ username, email }: { username?: string; email?: string }) =>
      patchOwnProfile({ username, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile.me"] });
      setEditOpen(false);
    },
  });

  // Delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: deleteOwnAccount,
    onSuccess: () => {
      localStorage.removeItem("EG_TOKEN");
      qc.clear();
      router.replace("/");
    },
  });

  return (
    <main className="p-6">
      {!hasToken ? (
        <div className="rounded-2xl border p-4 bg-white">Log in to view your profile.</div>
      ) : isLoading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border p-4 bg-white">Couldn’t load your profile.</div>
      ) : profile ? (
        <section className="relative rounded-2xl bg-white shadow p-6">
          {/* Top-right actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              className="px-3 py-1 rounded-xl bg-gray-100"
              onClick={() => setEditOpen(true)}
              title="Edit account"
            >
              Edit
            </button>
            <button
              className="px-3 py-1 rounded-xl bg-red-100"
              onClick={() => setConfirmOpen(true)}
              title="Delete account"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>

          <div className="flex items-start gap-6 pr-36">
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
              <p className="text-sm text-gray-500">{profile.email}</p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Stat label="Quests Created" value={profile.quests_created_count} />
                <Stat label="User Quests Completed" value={profile.user_quests_completed_count} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Edit modal */}
      <EditProfileModal
        open={editOpen}
        onClose={() => {
          if (!editMut.isPending) setEditOpen(false);
        }}
        username={editUsername}
        email={editEmail}
        setUsername={setEditUsername}
        setEmail={setEditEmail}
        onSubmit={() => editMut.mutate({ username: editUsername.trim(), email: editEmail.trim() })}
        submitting={editMut.isPending}
        errorMsg={(editMut.error as any)?.message}
      />

      {/* Confirm delete modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete your account?"
        body="This will delete your account and your user quests. Quests you created will remain."
        confirmText={deleteMut.isPending ? "Deleting…" : "Yes, delete my account"}
        cancelText="Nevermind"
        onCancel={() => {
          if (!deleteMut.isPending) setConfirmOpen(false);
        }}
        onConfirm={() => deleteMut.mutate()}
      />
    </main>
  );
}

/* UI bits */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  username,
  email,
  setUsername,
  setEmail,
  onSubmit,
  submitting,
  errorMsg,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  email: string;
  setUsername: (v: string) => void;
  setEmail: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMsg?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Edit Account</h2>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-gray-600">Username</span>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Email</span>
              <input
                type="email"
                className="w-full border rounded-xl px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded-xl bg-gray-100" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
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
