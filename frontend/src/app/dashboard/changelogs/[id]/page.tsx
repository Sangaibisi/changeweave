"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Changelog } from "@/lib/types";
import { ArrowLeft, Save, Eye, Check, Loader2, Code2, Trash2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import toast from "react-hot-toast";

export default function ChangelogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [showPreview, setShowPreview] = useState(searchParams.get("mode") !== "edit");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["changelog", id], queryFn: () => api.get<Changelog>(`/changelogs/${id}`) });
  const changelog = data?.data;
  useEffect(() => { if (changelog) { setContent(changelog.content || ""); setTitle(changelog.title || ""); } }, [changelog]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch<Changelog>(`/changelogs/${id}`, { title, content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelog", id] }); toast.success("Saved!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await api.patch<Changelog>(`/changelogs/${id}`, { title, content });
      return api.post<Changelog>(`/repos/${changelog?.repositoryId}/changelogs/${id}/publish`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["changelog", id] }); toast.success("Published!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/repos/${changelog?.repositoryId}/changelogs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog deleted!");
      router.back();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-txt-faint hover:text-txt-secondary transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-txt tracking-tight font-mono">{changelog?.version}</h1>
              <span className={changelog?.draft ? "badge-amber text-[10px]" : "badge-lime text-[10px]"}>
                {changelog?.draft ? "Draft" : "Published"}
              </span>
            </div>
            <p className="text-xs text-txt-faint mt-0.5">{changelog?.repositoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className={`btn-ghost !py-1.5 !px-3 !text-xs ${showPreview ? "!border-accent/30 !text-accent" : ""}`}>
            {showPreview ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Edit" : "Preview"}
          </button>
          {!showPreview && (
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="btn-ghost !py-1.5 !px-3 !text-xs disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          )}
          {changelog?.draft && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition disabled:opacity-50">
              {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Publish
            </button>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="btn-ghost !py-1.5 !px-2.5 !text-xs !text-txt-faint hover:!text-red-400 hover:!border-red-500/20">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost !py-1.5 !px-2.5 !text-[11px]">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {showPreview ? (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-txt">{title || changelog?.title}</h2>
            <p className="text-xs text-txt-faint mt-1">
              {changelog?.repositoryName} &middot; {changelog?.version}
            </p>
          </div>
          <div className="glass rounded-xl overflow-hidden" style={{ minHeight: 400 }}>
            <div className="p-6 sm:p-8">
              <MarkdownRenderer content={content || "*No content yet — click Edit to start writing or let AI generate it*"} />
            </div>
          </div>
        </>
      ) : (
        <>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Changelog title..."
            className="input-dark !text-lg !font-semibold !py-3 !px-4 mb-4" />

          <div className="glass rounded-xl overflow-hidden" style={{ minHeight: 500 }}>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Write your changelog in Markdown..."
              className="w-full h-full min-h-[500px] p-6 text-sm font-mono bg-transparent text-txt placeholder:text-txt-faint resize-none outline-none" />
          </div>
        </>
      )}
    </div>
  );
}
