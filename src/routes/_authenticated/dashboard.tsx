import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getDashboardSummary } from "@/lib/analyze.functions";
import { FileText, Sparkles, ClipboardList, TrendingUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CV Analyser" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchSummary = useServerFn(getDashboardSummary);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchSummary(),
  });
  const router = useRouter();

  if (isLoading) {
    return <AppShell><div className="text-muted-foreground">Loading your dashboard…</div></AppShell>;
  }

  const latest = data?.analyses?.[0];
  const latestResult = latest?.result as { overall_score?: number; summary?: string } | undefined;
  const recos = (data?.questionnaire?.recommendations ?? []) as Array<{ role: string; suitability: number }>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your CV progress and next steps.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/cvs" className="px-4 py-2 rounded-md border border-border text-sm hover:bg-secondary">
            Upload CV
          </Link>
          <Link to="/analyze" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
            New analysis
          </Link>
        </div>
      </div>

      {!data?.questionnaire && (
        <div className="mb-6 rounded-xl border border-border bg-accent/40 p-5 flex items-center justify-between">
          <div>
            <div className="font-medium">Start with the career quiz</div>
            <div className="text-sm text-muted-foreground">Answer 11 quick questions to see roles that suit you.</div>
          </div>
          <button onClick={() => router.navigate({ to: "/questionnaire" })} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">
            Take the quiz
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={FileText} label="Latest CV">
          <div className="text-lg font-semibold truncate">{data?.latestCv?.name ?? "No CV yet"}</div>
          <Link to="/cvs" className="text-xs text-primary hover:underline mt-1 inline-block">Manage CVs →</Link>
        </Card>
        <Card icon={Sparkles} label="Latest target role">
          <div className="text-lg font-semibold truncate">{latest?.target_role ?? "—"}</div>
        </Card>
        <Card icon={TrendingUp} label="Latest match score">
          <ScoreRing value={latestResult?.overall_score ?? 0} />
        </Card>
      </div>

      {data?.nextAction && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Top priority to-do</div>
          <div className="mt-2 font-medium">{data.nextAction.text}</div>
          <Link to="/analysis/$id" params={{ id: data.nextAction.analysis_id }} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open advice <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Previous analyses</h2>
            {latest && <span className="text-xs text-muted-foreground">{data?.analyses?.length} total</span>}
          </div>
          {!data?.analyses?.length ? (
            <EmptyState icon={Sparkles} title="No analyses yet" body="Upload a CV and pick a role to get started." />
          ) : (
            <div className="space-y-2">
              {data.analyses.map((a) => {
                const r = a.result as { overall_score?: number };
                return (
                  <Link key={a.id} to="/analysis/$id" params={{ id: a.id }} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.target_role}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.cv_name} · {new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-lg font-semibold text-primary">{r?.overall_score ?? "—"}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recommended roles</h2>
            <Link to="/questionnaire" className="text-xs text-primary hover:underline">Retake quiz</Link>
          </div>
          {!recos.length ? (
            <EmptyState icon={ClipboardList} title="Take the quiz" body="Get 3–5 role recommendations tailored to you." />
          ) : (
            <div className="space-y-2">
              {recos.map((r) => (
                <div key={r.role} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                  <div className="font-medium">{r.role}</div>
                  <div className="text-sm text-muted-foreground">{r.suitability}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Card({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{pct}</span>
      </div>
      <div className="text-xs text-muted-foreground">out of 100</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground mx-auto" />
      <div className="mt-2 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{body}</div>
    </div>
  );
}