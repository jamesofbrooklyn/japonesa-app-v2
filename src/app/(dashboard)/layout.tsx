import Shell from "@/components/Shell";
import { ToastProvider } from "@/components/Toast";
import { optionalAuth } from "@/lib/auth";
import { ALL_CONCEPTS, getActiveConcept } from "@/lib/concept";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await optionalAuth();

  const user = auth
    ? {
        displayName: auth.profile.display_name,
        role: auth.profile.role,
        concept: auth.profile.concept,
      }
    : undefined;

  // For unauthenticated visitors, default to japonesa so the wordmark renders.
  // Owners get their cookie-selected concept (default japonesa). Managers are
  // pinned to their profile.concept by getActiveConcept().
  const activeConcept = auth ? await getActiveConcept(auth.profile) : "japonesa";

  // Owners can switch across all concepts; managers are pinned to one.
  const conceptOptions =
    auth?.profile.role === "owner" ? ALL_CONCEPTS : [activeConcept];

  return (
    <ToastProvider>
      <Shell user={user} activeConcept={activeConcept} conceptOptions={conceptOptions}>
        {children}
      </Shell>
    </ToastProvider>
  );
}
