import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getAnalysis, updateRecommendationStatus } from "@/lib/analyze.functions";
import type { AnalysisResult } from "@/lib/analyze.functions";

export const Route = createFileRoute("/_authenticated/analysis/$id")({
  head: () => ({ meta: [{ title: "CV analysis — CV Analyser" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const fetchAnalysis = useServerFn(getAnalysis);
  const updateStatus = useServerFn(updateRecommendationStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => fetchAnalysis({ data: { id } }),
  });

  if (isLoading) return <AppShell><div className="text-muted-foreground">Loading analysis…</div></AppShell>;
  if (!data) return <AppShell><div>Not found</div></AppShell>;

  const r = data.analysis.result as AnalysisResult;

  async function setStatus(itemId: string, status: "todo" | "in_progress" | "completed" | "not_applicable") {
    await updateStatus({ data: { id: itemId, status } });
    qc.invalidateQueries({ queryKey: ["analysis", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{data.analysis.target_role}</h1>
          <p className="text-sm text-muted-foreground">
            {data.analysis.cv_name} · {new Date(data.analysis.created_at).toLocaleString()} · model: <code className="text-xs">{data.analysis.model}</code>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground">Overall match</div>
          <div className="text-5xl font-bold text-primary">{r.overall_score}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4 mb-6">
        <ScoreBar label="Relevant skills" value={r.scores.relevant_skills} />
        <ScoreBar label="Experience" value={r.scores.experience} />
        <ScoreBar label="Education" value={r.scores.education} />
        <ScoreBar label="Projects" value={r.scores.projects} />
        <ScoreBar label="Clarity" value={r.scores.clarity} />
        <ScoreBar label="Keyword match" value={r.scores.keyword_match} />
        <ScoreBar label="ATS compatibility" value={r.scores.ats_compatibility} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Panel title="Strengths" tone="success">
          <List items={r.strengths} />
        </Panel>
        <Panel title="Weak or missing areas" tone="warning">
          <List items={r.weaknesses} />
        </Panel>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <h2 className="font-semibold mb-3">Recommendations</h2>
        <div className="space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <PriorityDot p={it.priority as "high" | "medium" | "low"} />
              <div className="flex-1 text-sm">{it.text}</div>
              <select
                value={it.status}
                onChange={(e) => setStatus(it.id, e.target.value as "todo" | "in_progress" | "completed" | "not_applicable")}
                className="text-xs rounded-md border border-input bg-background px-2 py-1"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {r.wording_improvements?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-3">Suggested wording</h2>
          <div className="space-y-3">
            {r.wording_improvements.map((w, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase text-muted-foreground">Before</div>
                <div className="text-sm italic">"{w.original}"</div>
                <div className="mt-2 text-xs uppercase text-muted-foreground">Suggested</div>
                <div className="text-sm">{w.suggested}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Keywords found">
          <Tags items={r.keywords_found} />
        </Panel>
        <Panel title="Keywords missing">
          <Tags items={r.keywords_missing} tone="warning" />
        </Panel>
      </div>
    </AppShell>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, tone, children }: { title: string; tone?: "success" | "warning"; children: React.ReactNode }) {
  const color = tone === "success" ? "text-[color:oklch(0.55_0.15_155)]" : tone === "warning" ? "text-[color:oklch(0.65_0.15_75)]" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className={`font-semibold mb-3 ${color}`}>{title}</h3>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items?.map((s, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span>{s}</li>)}
    </ul>
  );
}

function Tags({ items, tone }: { items: string[]; tone?: "warning" }) {
  if (!items?.length) return <div className="text-sm text-muted-foreground">None</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span key={k} className={`px-2 py-1 rounded-md text-xs ${tone === "warning" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>{k}</span>
      ))}
    </div>
  );
}

function PriorityDot({ p }: { p: "high" | "medium" | "low" }) {
  const color = p === "high" ? "bg-destructive" : p === "medium" ? "bg-[color:oklch(0.75_0.15_75)]" : "bg-muted-foreground";
  return <span className={`mt-1.5 h-2 w-2 rounded-full ${color} shrink-0`} title={p} />;
}