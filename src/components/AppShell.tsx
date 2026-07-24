import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FileText, LayoutDashboard, ClipboardList, Sparkles, LogOut, Upload } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/questionnaire", label: "Career Quiz", icon: ClipboardList },
    { to: "/cvs", label: "My CVs", icon: FileText },
    { to: "/analyze", label: "Analyse CV", icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Upload className="h-4 w-4" />
            </span>
            <span>CV Analyser</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeProps={{ className: "px-3 py-1.5 rounded-md text-sm bg-secondary text-foreground font-medium" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="whitespace-nowrap px-3 py-1.5 rounded-md text-xs bg-secondary text-secondary-foreground"
              activeProps={{ className: "whitespace-nowrap px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}