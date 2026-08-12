import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getOrCreateUserSettings } from "@/lib/services/settings-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const settings = await getOrCreateUserSettings(session.user.id);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar productName={settings.productName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar productName={settings.productName} name={session.user.name} email={session.user.email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
