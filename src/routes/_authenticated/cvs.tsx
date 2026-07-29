import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { listCVs, saveCV, deleteCV } from "@/lib/cv.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cvs")({
  head: () => ({ meta: [{ title: "My CVs — CV Analyser" }] }),
  component: CVs,
});

function CVs() {
  const qc = useQueryClient();
  const list = useServerFn(listCVs);
  const save = useServerFn(saveCV);
  const del = useServerFn(deleteCV);
  const { data: cvs, isLoading } = useQuery({ queryKey: ["cvs"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || text.length < 50) {
      toast.error("Please paste your CV text (at least 50 characters).");
      return;
    }
    setUploading(true);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("Session exists:", Boolean(session));
    console.log("Signed-in user:", session?.user.email);
    console.log("Session error:", sessionError);

    if (!session) {
      throw new Error("No valid login session. Please sign in again.");
    }
    try {
      let filePath: string | null = null;
      let fileType: string | null = null;
      if (file) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("Not signed in");
        const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("cvs").upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
        fileType = file.type || file.name.split(".").pop() || null;
      }
      await save({
        data: {
          name: name || file?.name || "Untitled CV",
          file_path: filePath,
          file_type: fileType,
          extracted_text: text,
        },
      });
      toast.success("CV saved");
      setName("");
      setFile(null);
      setText("");
      qc.invalidateQueries({ queryKey: ["cvs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save CV");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this CV?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["cvs"] });
    toast.success("CV deleted");
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight">My CVs</h1>
      <p className="text-muted-foreground mt-1">
        Upload a PDF or DOCX, and paste the text so we can analyse it against roles.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4" /> Add a CV
          </h2>
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grad CV v3"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">File (PDF or DOCX, optional)</label>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">CV text</label>
            <p className="text-xs text-muted-foreground mb-1">
              Copy the text from your CV and paste it here — this is what the AI reads.
            </p>
            <textarea
              rows={10}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your CV text here…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            disabled={uploading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {uploading ? "Saving…" : "Save CV"}
          </button>
        </form>

        <div>
          <h2 className="font-semibold mb-3">Your CVs</h2>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : !cvs?.length ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No CVs yet. Add one on the left.
            </div>
          ) : (
            <div className="space-y-2">
              {cvs.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
