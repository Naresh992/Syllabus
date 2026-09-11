import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        name: user.name,
        tier: user.tier,
        isAdmin: user.isAdmin,
        verificationStatus: user.verificationStatus,
      }}
    >
      {children}
    </AppShell>
  );
}
