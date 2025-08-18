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
  listMyUserQuests,
  adoptUserQuest,
  UserQuest,
} from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";

export default function QuestsPage() {
  const qc = useQueryClient();

  const { data: quests, isLoading, error } = useQuery<Quest[]>({
    queryKey: ["quests"],
    queryFn: API.listQuests,
  });

  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, []);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: API.me,
    enabled: hasToken,
  });

  const { data: myUserQuests = [] } = useQuery<UserQuest[]>({
    queryKey: ["my-user-quests"],
    queryFn: listMyUserQuests,
    enabled: hasToken,
  });

  const inProgressSet = useMemo(
    () => new Set(myUserQuests.filter((u) => !u.completed).map((u) => u.quest.id)),
    [myUserQuests]
  );

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

  const categoriesAZ = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const tagsAZ = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
    [tags]
  );

  const [qText, setQText] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | "">("");
  const [filterTagIds, setFilterTagIds] = useState<Set<number>>(new Set());

  function toggleFilterTag(id: number) {
    setFilterTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const clearFilters = () => {
    setQText("");
    setFilterCategoryId("");
    setFilterTagIds(new Set());
  };

  const filteredQuests = useMemo(() => {
    if (!quests) return [];
    const text = qText.trim().toLowerCase();

    return quests.filter((q) => {
      if (filterCategoryId && q.category?.id !== Number(filterCategoryId)) return false;

      if (filterTagIds.size > 0) {
        const hasAny = q.tags?.some((t) => filterTagIds.has(t.id));
        if (!hasAny) return false;
      }

      if (text) {
        const hay = [
          q.title,
          q.description || "",
          q.category?.name || "",
          ...(q.tags?.map((t) => t.name) || []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(text)) return false;
      }

      return true;
    });
  }, [quests, qText, filterCategoryId, filterTagIds]);

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

  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const adoptMut = useMutation({
    mutationFn: (questId: number) => adoptUserQuest(questId),
    onMutate: (qid) => setAdoptingId(qid),
    onError: (e: any) => {
      alert(e?.message || "Could not undertake this quest.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-user-quests"] });
    },
    onSettled: () => setAdoptingId(null),
  });

  const [showCreate, setShowCreate] = useState(false);

  // Tags popover state
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsQuery, setTagsQuery] = useState("");
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tagsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setTagsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [tagsOpen]);

  const tagsFiltered = useMemo(() => {
    const q = tagsQuery.trim().toLowerCase();
    if (!q) return tagsAZ;
    return tagsAZ.filter((t) => t.name.toLowerCase().includes(q));
  }, [tagsAZ, tagsQuery]);

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

      {/* Filters */}
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-3">
          <input
            className="w-full md:max-w-md border rounded-xl px-3 py-2"
            placeholder="Search quests…"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />
          <select
            className="border rounded-xl px-3 py-2"
            value={filterCategoryId}
            onChange={(e) =>
              setFilterCategoryId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">All categories</option>
            {categoriesAZ.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Tags popover trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTagsOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50"
              aria-expanded={tagsOpen}
              aria-haspopup="dialog"
            >
              Tags
              {filterTagIds.size > 0 && (
                <span className="text-xs rounded-full bg-emerald-100 px-2 py-0.5">
                  {filterTagIds.size}
                </span>
              )}
            </button>

            {tagsOpen && (
              <div
                ref={popRef}
                className="absolute z-50 mt-2 w-72 max-h-72 overflow-auto rounded-2xl border bg-white p-3 shadow-lg"
                role="dialog"
                aria-label="Filter by tags"
              >
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  placeholder="Search tags…"
                  value={tagsQuery}
                  onChange={(e) => setTagsQuery(e.target.value)}
                />

                <div className="mt-2 flex flex-col gap-1">
                  {tagsFiltered.map((t) => {
                    const checked = filterTagIds.has(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFilterTag(t.id)}
                        />
                        <span className="text-sm">#{t.name}</span>
                      </label>
                    );
                  })}
                  {!tagsFiltered.length && (
                    <div className="text-sm text-gray-500 px-2 py-4">No tags</div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="text-sm underline"
                    onClick={() => setFilterTagIds(new Set())}
                    disabled={filterTagIds.size === 0}
                  >
                    Clear
                  </button>
                  <button
                    className="text-sm rounded-md border px-3 py-1"
                    onClick={() => setTagsOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(qText || filterCategoryId || filterTagIds.size > 0) && (
            <button className="text-sm underline" onClick={clearFilters}>
              Clear filters
            </button>
          )}
          <span className="text-sm text-gray-600">
            {filteredQuests.length} result{filteredQuests.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {/* Selected tags summary */}
      {filterTagIds.size > 0 && (
        <div className="flex flex-wrap gap-1">
          {tagsAZ
            .filter((t) => filterTagIds.has(t.id))
            .slice(0, 3)
            .map((t) => (
              <span key={t.id} className="text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
                #{t.name}
              </span>
            ))}
          {filterTagIds.size > 3 && (
            <span className="text-xs text-gray-600">
              +{filterTagIds.size - 3} more
            </span>
          )}
        </div>
      )}

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
              setShowCreate(false);
            },
          })
        }
      />

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuests.map((q) => {
          const canEdit = !!me && me.id === q.created_by;
          const canDelete = !!me && (me as any).is_moderator;
          const canUndertake = hasToken && !inProgressSet.has(q.id);
          const undertaking = adoptingId === q.id;

          return (
            <QuestCard
              key={q.id}
              q={q}
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={() => deleteMut.mutate(q.id)}
              onSave={(body) => patchMut.mutate({ id: q.id, body })}
              saving={patchMut.isPending}
              deleting={deleteMut.isPending}
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const cats = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const icos = useMemo(() => [...icons].sort((a, b) => a.name.localeCompare(b.name)), [icons]);
  const diffs = useMemo(() => {
    const order: Record<string, number> = { Easy: 1, Moderate: 2, Difficult: 3 };
    return [...difficulties].sort((a, b) => {
      const ai = order[a.name] ?? 999;
      const bi = order[b.name] ?? 999;
      return ai - bi || a.name.localeCompare(b.name);
    });
  }, [difficulties]);
  const allTags = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
    [tags]
  );

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [iconId, setIconId] = useState<number | "">("");
  const [difficultyId, setDifficultyId] = useState<number | "">("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

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
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !title.trim() ||
      !description.trim() ||
      categoryId === "" ||
      iconId === "" ||
      difficultyId === ""
    ) {
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
      tag_ids: selectedTags.length ? selectedTags : undefined,
    });

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
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
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
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
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
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
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
                className={`flex items-center gap-2 px-2 py-1 rounded-full border ${
                  checked ? "bg-emerald-50" : "bg-white"
                }`}
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
          {!allTags.length && (
            <span className="text-sm text-gray-500">No tags yet</span>
          )}
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
  canDelete,
  onDelete,
  onSave,
  saving,
  deleting,
  canUndertake,
  undertaking,
  onUndertake,
}: {
  q: Quest;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onSave: (body: Partial<QuestPatchBody>) => void;
  saving: boolean;
  deleting: boolean;
  canUndertake: boolean;
  undertaking: boolean;
  onUndertake: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(q.title);
  const [description, setDescription] = useState(q.description || "");

  return (
    <li className="relative rounded-2xl shadow p-4 bg-white space-y-3">
      {(canEdit || canDelete) && (
        <div className="absolute top-3 right-3 flex gap-2">
          {canEdit && !editing && (
            <button
              className="px-3 py-1 rounded-xl bg-gray-100"
              onClick={() => setEditing(true)}
              title="Edit quest"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              className="px-3 py-1 rounded-xl bg-red-100"
              onClick={onDelete}
              disabled={deleting}
              title="Admin only"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      )}

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
          </div>
        </>
      )}
    </li>
  );
}
