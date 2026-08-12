import { Target } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_45%),radial-gradient(circle_at_80%_80%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_45%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">LeadForge</span>
        </div>
        {children}
      </div>
    </div>
  );
}
