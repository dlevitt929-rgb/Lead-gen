import { CommandPalette } from "@/components/layout/command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Target } from "lucide-react";

export function Topbar({
  productName,
  name,
  email,
}: {
  productName: string;
  name?: string | null;
  email?: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm">
      <MobileNav />
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Target className="size-3.5" />
        </div>
        <span className="text-sm font-semibold">{productName}</span>
      </div>
      <div className="flex-1" />
      <div className="hidden sm:block">
        <CommandPalette />
      </div>
      <ThemeToggle />
      <UserMenu name={name} email={email} />
    </header>
  );
}
