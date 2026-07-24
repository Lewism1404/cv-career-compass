import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { listCVs, getCV } from "@/lib/cv.functions";
import { getLatestQuestionnaire } from "@/lib/questionnaire.functions";
import { analyzeCV } from "@/lib/analyze.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({ meta: [{ title: "Analyse CV — CV Analyser" }] }),
  component: Analyze,
});

const PRESET_ROLES = [
  "Graduate Software Engineer",
  "Web Developer",
  "Software Tester",
  "Data Analyst",
  "IT Support Technician",
  "Cyber Security Analyst",
  "Business Analyst",
  "Technical Consultant",
  "Automation Software Engineer",
];

function Analyze() {
  const list = useServerFn(listCVs);
  const load = useServerFn(getCV);
  const latestQ = useServerFn(getLatestQuestionnaire);
  const run = useServerFn(analyzeCV);
  const router = useRouter();

  const { data: cvs } = useQuery({ queryKey: ["cvs"], queryFn: () => list() });
  const { data: q } = useQuery({ queryKey: ["latest-questionnaire"], queryFn: () => latestQ() });

  const [cvId, setCvId] = useState<string>("");
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);

  const recommended = ((q?.recommendations ?? []) as Array<{ role: string }>).map((r) => r.role);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalRole = customRole.trim() || role;
    if (!cvId) return toast.error("Please choose a CV.");
    if (!finalRole) return toast.error("Please choose or enter a target role.");
    setLoading(true);
    try {
      const cv = await load({ data: { id: cvId } });
      if (!cv?.extracted_text) throw new Error("This CV has no text saved.");
      const res = await run({
        data: {
          cv_id: cvId,
          cv_name: cv.name,
          cv_text: cv.extracted_text,
          target_role: finalRole,
          job_description: jd,
        },
      });
      toast.success("Analysis complete");
      router.navigate({ to: "/analysis/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Analyse a CV</h1>
        <p className="text-muted-foreground mt-1">Choose a CV and target role — we'll do the rest.</p>

        <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium">CV</label>
            {!cvs?.length ? (
              <div className="mt-2 text-sm text-muted-foreground">No CVs yet. <a href="/cvs" className="text-primary underline">Add one first</a>.</div>
            ) : (
              <select value={cvId} onChange={(e) => setCvId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Select a CV…</option>
                {cvs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {recommended.length > 0 && (
            <div>
              <label className="text-sm font-medium">Recommended for you</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommended.map((r) => (
                  <button type="button" key={r} onClick={() => { setRole(r); setCustomRole(""); }} className={`px-3 py-1.5 rounded-full text-xs border ${role === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{r}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Or pick a common role</label>
            <select value={PRESET_ROLES.includes(role) ? role : ""} onChange={(e) => { setRole(e.target.value); setCustomRole(""); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select…</option>
              {PRESET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Or enter a custom role</label>
            <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="e.g. Junior DevOps Engineer" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-sm font-medium">Job description (optional)</label>
            <textarea rows={5} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description for a more targeted analysis." className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <button disabled={loading} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50">
            {loading ? "Analysing your CV…" : "Analyse CV"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}