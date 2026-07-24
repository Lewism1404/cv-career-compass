import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { submitQuestionnaire } from "@/lib/questionnaire.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/questionnaire")({
  head: () => ({ meta: [{ title: "Career quiz — CV Analyser" }] }),
  component: Quiz,
});

type A = {
  interest_programming: number;
  interest_data: number;
  interest_cyber: number;
  interest_support: number;
  work_style: "independent" | "team" | "mixed";
  problem_solving_confidence: number;
  communication_confidence: number;
  practical_theoretical: "practical" | "theoretical" | "balanced";
  qualifications: string;
  current_skills: string;
  improvement_areas: string;
};

const defaults: A = {
  interest_programming: 3,
  interest_data: 3,
  interest_cyber: 3,
  interest_support: 3,
  work_style: "mixed",
  problem_solving_confidence: 3,
  communication_confidence: 3,
  practical_theoretical: "balanced",
  qualifications: "",
  current_skills: "",
  improvement_areas: "",
};

function Quiz() {
  const [a, setA] = useState<A>(defaults);
  const [loading, setLoading] = useState(false);
  const submit = useServerFn(submitQuestionnaire);
  const router = useRouter();

  function upd<K extends keyof A>(k: K, v: A[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submit({ data: a });
      toast.success("Recommendations ready!");
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Career quiz</h1>
        <p className="text-muted-foreground mt-1">A few quick questions to recommend roles that suit you.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Section title="How interested are you in…">
            <Scale label="Programming / software development" value={a.interest_programming} onChange={(v) => upd("interest_programming", v)} />
            <Scale label="Working with data & analytics" value={a.interest_data} onChange={(v) => upd("interest_data", v)} />
            <Scale label="Cyber security" value={a.interest_cyber} onChange={(v) => upd("interest_cyber", v)} />
            <Scale label="Technical / IT support" value={a.interest_support} onChange={(v) => upd("interest_support", v)} />
          </Section>

          <Section title="Working style">
            <RadioRow
              label="Do you prefer working…"
              value={a.work_style}
              onChange={(v) => upd("work_style", v as A["work_style"])}
              options={[
                { value: "independent", label: "Independently" },
                { value: "team", label: "In a team" },
                { value: "mixed", label: "A mix" },
              ]}
            />
            <RadioRow
              label="Practical or theoretical work?"
              value={a.practical_theoretical}
              onChange={(v) => upd("practical_theoretical", v as A["practical_theoretical"])}
              options={[
                { value: "practical", label: "Practical / hands-on" },
                { value: "theoretical", label: "Theoretical / research" },
                { value: "balanced", label: "Balanced" },
              ]}
            />
          </Section>

          <Section title="Confidence">
            <Scale label="Problem-solving" value={a.problem_solving_confidence} onChange={(v) => upd("problem_solving_confidence", v)} />
            <Scale label="Communication" value={a.communication_confidence} onChange={(v) => upd("communication_confidence", v)} />
          </Section>

          <Section title="About you">
            <TextArea label="Existing qualifications" placeholder="e.g. BSc Computer Science, A-levels, industry certifications" value={a.qualifications} onChange={(v) => upd("qualifications", v)} />
            <TextArea label="Current technical skills" placeholder="e.g. Python, SQL, React, Linux" value={a.current_skills} onChange={(v) => upd("current_skills", v)} />
            <TextArea label="Areas you want to improve" placeholder="e.g. system design, testing, cloud" value={a.improvement_areas} onChange={(v) => upd("improvement_areas", v)} />
          </Section>

          <button
            disabled={loading}
            className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {loading ? "Finding your best-fit roles…" : "Get my recommendations"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}/5</span>
      </div>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-md border text-sm ${n === value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function RadioRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <div className="text-sm mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 rounded-md border text-sm ${value === o.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextArea({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <textarea
        rows={2}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}