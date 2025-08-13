"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  API,
  Quest,
  QuestPatchBody,
  QuestCreateBody,
  Category,
  Icon,
  Difficulty,
  Tag,
  getAuthToken,
  // new imports
  listMyUserQuests,
  adoptUserQuest,
  UserQuest,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

export default function QuestsPage() {
  const qc = useQueryClient();

  // fetch quests (public GET)
  const { data: quests, isLoading, error } = useQuery<Quest[]>({
    queryKey: ["quests"],
    queryFn: API.listQuests,
  });

  // auth presence
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, []);

  // current user (only when logged in)
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: API.me,
    enabled: hasToken,
  });

  // my active user_quests to prevent duplicate undertaking
  const { data: myUserQuests = [] } = useQuery<UserQuest[]>({
    queryKey: ["my-user-quests"],
    queryFn: listMyUserQuests,
    enabled: hasToken,
  });

  // set of quest IDs already in progress for me
  const inProgressSet = useMemo(() => {
    return new Set(myUserQuests.filter((u) => !u.completed).map((u) => u.quest.id));
  }, [myUserQuests]);

  // dropdown data
  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: API.listCategories,
  });
  const { data: icons = [], isLoading: iconLoading } = useQuery<Icon[]>({
    queryKey: ["icons"],
    queryFn: API.listIcons,
  });
  const { data: difficulties = [], isLoading: diffLoading } = useQuery<Difficulty[]>({
    queryKey: ["difficulties"],
    queryFn: API.listDifficulties,
  });
  const { data: tags = [], isLoading: tagLoading } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: API.listTags,
  });

  // mutations
  const deleteMut = useMutation({
    mutationFn: (id: number) => API.deleteQuest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quests"] }),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<QuestPatchBody> }) =>
      API.patchQuest(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quests"] }),
  });

  const createMut = useMutation({
    mutationFn: (body: QuestCreateBody) => API.createQuest(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quests"] }),
  });

  // NEW: undertake (adopt) mutation
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const adoptMut = useMutation({
    mutationFn: (questId: number) => adoptUserQuest(questId),
    onMutate: (qid) => setAdoptingId(qid),
    onError: (e: any) => {
      alert(e?.message || "Could not undertake this quest.");
    },
    onSuccess: () => {
      // refresh my-user-quests so /my-quests shows it immediately
      qc.invalidateQueries({ queryKey: ["my-user-quests"] });
    },
    onSettled: () => setAdoptingId(null),
  });

  // modal state
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <div className="p-6">Loading quests…</div>;
  if (error) return <div className="p-6">Couldn’t load quests.</div>;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">EcoGrow Quests</h1>
        {hasToken && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
          >
            + Create Quest
          </button>
        )}
      </div>

      {/* Create Quest Modal */}
      <CreateQuestModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        categories={categories}
        icons={icons}
        difficulties={difficulties}
        tags={tags}
        loading={catLoading || iconLoading || diffLoading || tagLoading}
        creating={createMut.isPending}
        onCreate={(body) =>
          createMut.mutate(body, {
            onSuccess: () => {
              setShowCreate(false); // close modal on success
            },
          })
        }
      />

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quests?.map((q) => {
          const canEdit = !!me && me.id === q.created_by;
          const canUndertake = hasToken && !inProgressSet.has(q.id);
          const undertaking = adoptingId === q.id;

          return (
            <QuestCard
              key={q.id}
              q={q}
              canEdit={canEdit}
              onDelete={() => deleteMut.mutate(q.id)}
              onSave={(body) => patchMut.mutate({ id: q.id, body })}
              saving={patchMut.isPending}
              deleting={deleteMut.isPending}
              // new props
              canUndertake={canUndertake}
              undertaking={undertaking}
              onUndertake={() => adoptMut.mutate(q.id)}
            />
          );
        })}
      </ul>
    </main>
  );
}

function CreateQuestModal({
  open,
  onClose,
  categories,
  icons,
  difficulties,
  tags,
  loading,
  creating,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  icons: Icon[];
  difficulties: Difficulty[];
  tags: Tag[];
  loading: boolean;
  creating: boolean;
  onCreate: (body: QuestCreateBody) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Create a Quest</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <CreateQuestForm
            categories={categories}
            icons={icons}
            difficulties={difficulties}
            tags={tags}
            loading={loading}
            creating={creating}
            onCreate={onCreate}
          />
        </div>
      </div>
    </div>
  );
}

function CreateQuestForm({
  categories,
  icons,
  difficulties,
  tags,
  loading,
  creating,
  onCreate,
}: {
  categories: Category[];
  icons: Icon[];
  difficulties: Difficulty[];
  tags: Tag[];
  loading: boolean;
  creating: boolean;
  onCreate: (body: QuestCreateBody) => void;
}) {
  // local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // sorted lists (A→Z)
  const cats = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const icos = useMemo(() => [...icons].sort((a, b) => a.name.localeCompare(b.name)), [icons]);
  const diffs = useMemo(() => [...difficulties].sort((a, b) => a.name.localeCompare(b.name)), [difficulties]);
  const allTags = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags]);

  // select state (default to first available when data arrives)
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [iconId, setIconId] = useState<number | "">("");
  const [difficultyId, setDifficultyId] = useState<number | "">("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]); // up to 3

  useEffect(() => {
    if (cats.length && categoryId === "") setCategoryId(cats[0].id);
  }, [cats, categoryId]);
  useEffect(() => {
    if (icos.length && iconId === "") setIconId(icos[0].id);
  }, [icos, iconId]);
  useEffect(() => {
    if (diffs.length && difficultyId === "") setDifficultyId(diffs[0].id);
  }, [diffs, difficultyId]);

  function toggleTag(id: number) {
    setSelectedTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= 3) return prev; // UI-only limit
      return [...prev, id];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim() || categoryId === "" || iconId === "" || difficultyId === "") {
      alert("Title, description, category, icon, and difficulty are required.");
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim(),
      category_id: Number(categoryId),
      icon_id: Number(iconId),
      difficulty_id: Number(difficultyId),
      is_custom: false,
      tag_ids: selectedTags.length ? selectedTags : undefined, // optional
    });

    // reset minimal fields; keep dropdown selections
    setTitle("");
    setDescription("");
    setSelectedTags([]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3">
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Description *"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-sm text-gray-600">Category *</span>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            disabled={loading || !cats.length}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Icon *</span>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={iconId}
            onChange={(e) => setIconId(Number(e.target.value))}
            disabled={loading || !icos.length}
          >
            {icos.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Difficulty *</span>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={difficultyId}
            onChange={(e) => setDifficultyId(Number(e.target.value))}
            disabled={loading || !diffs.length}
          >
            {diffs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-gray-600">Tags (optional, up to 3)</span>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => {
            const checked = selectedTags.includes(t.id);
            const reachedMax = selectedTags.length >= 3 && !checked;
            return (
              <label
                key={t.id}
                className={`flex items-center gap-2 px-2 py-1 rounded-full border ${checked ? "bg-emerald-50" : "bg-white"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={reachedMax}
                  onChange={() => toggleTag(t.id)}
                />
                <span className="text-sm">#{t.name}</span>
              </label>
            );
          })}
          {!allTags.length && <span className="text-sm text-gray-500">No tags yet</span>}
        </div>
        {selectedTags.length === 3 && (
          <p className="text-xs text-gray-500">Max 3 tags selected.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
          disabled={creating || loading || !cats.length || !icos.length || !diffs.length}
        >
          {creating ? "Creating…" : "Create Quest"}
        </button>
      </div>
    </form>
  );
}

function QuestCard({
  q,
  canEdit,
  onDelete,
  onSave,
  saving,
  deleting,
  // new props
  canUndertake,
  undertaking,
  onUndertake,
}: {
  q: Quest;
  canEdit: boolean;
  onDelete: () => void;
  onSave: (body: Partial<QuestPatchBody>) => void;
  saving: boolean;
  deleting: boolean;
  // new props
  canUndertake: boolean;
  undertaking: boolean;
  onUndertake: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(q.title);
  const [description, setDescription] = useState(q.description || "");

  return (
    <li className="rounded-2xl shadow p-4 bg-white space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {q.icon?.icon_url && (
          <img src={q.icon.icon_url} alt={q.icon.name} className="h-8 w-8" />
        )}
        <div>
          <h2 className="text-lg font-semibold">{q.title}</h2>
          <p className="text-sm text-gray-500">
            {q.category?.name} · {q.difficulty?.name}
          </p>
        </div>
      </div>

      {editing ? (
        <>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="w-full border rounded-xl px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded-xl bg-emerald-100"
              onClick={() => {
                onSave({ title, description });
                setEditing(false);
              }}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-3 py-1 rounded-xl bg-gray-100"
              onClick={() => {
                setTitle(q.title);
                setDescription(q.description || "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700">{q.description}</p>
          {!!q.tags?.length && (
            <div className="flex flex-wrap gap-2">
              {q.tags.map((t) => (
                <span
                  key={t.id}
                  className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                >
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* Undertake button (shown when logged in and not already in progress) */}
            {canUndertake && (
              <button
                className="px-3 py-1 rounded-xl bg-emerald-600 text-white"
                onClick={onUndertake}
                disabled={undertaking}
                title="Add this quest to My Quests"
              >
                {undertaking ? "Undertaking…" : "Undertake Quest"}
              </button>
            )}

            {/* Owner controls */}
            {canEdit && (
              <>
                <button
                  className="px-3 py-1 rounded-xl bg-gray-100"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1 rounded-xl bg-red-100"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
}
