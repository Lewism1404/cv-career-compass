import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, FileText, Target, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CV Analyser | Role-specific CV feedback for graduates" },
      {
        name: "description",
        content:
          "Discover suitable tech roles, upload your CV and get AI-powered, role-specific feedback to land your next graduate job.",
      },
      { property: "og:title", content: "CV Analyser - Role-specific CV feedback" },
      {
        property: "og:description",
        content: "Upload your CV, pick a role and get actionable AI feedback in seconds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm">
              CV
            </span>
            CV Analyser
          </div>
          <Link
            to="/auth"
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered CV feedback
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Land the tech role <span className="text-primary">that fits you</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover roles suited to your strengths, upload your CV, and get role-specific, actionable
          feedback built for graduates and early-career job seekers.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/auth"
            className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            to="/auth"
            className="px-5 py-2.5 rounded-md border border-border hover:bg-secondary"
          >
            I have an account
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-24 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Target,
            title: "Find your fit",
            body: "A short quiz recommends 3 - 5 tech roles matched to your interests and skills.",
          },
          {
            icon: FileText,
            title: "Upload your CV",
            body: "PDF or DOCX. Your CVs are private and stored securely to your account.",
          },
          {
            icon: CheckCircle2,
            title: "Get role-specific advice",
            body: "Match score, keyword gaps, wording rewrites and a tracked to-do list.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
