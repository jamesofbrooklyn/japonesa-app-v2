import Shell from "@/components/Shell";
import { optionalAuth } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await optionalAuth();

  const user = auth
    ? {
        displayName: auth.profile.display_name,
        role: auth.profile.role,
        concept: auth.profile.concept,
      }
    : undefined;

  return <Shell user={user}>{children}</Shell>;
}
