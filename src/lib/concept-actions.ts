"use server";

import { cookies } from "next/headers";
import { CONCEPT_COOKIE_NAME, isValidConcept } from "./concept";

/**
 * Server action used by ConceptSwitcher. Owners only — managers are fixed.
 * Sets a long-lived cookie (1 year) since this is a UI preference, not
 * security-relevant (RLS still enforces concept access at the DB layer).
 */
export async function setActiveConcept(next: string): Promise<void> {
  if (!isValidConcept(next)) {
    throw new Error(`Invalid concept: ${next}`);
  }
  const store = await cookies();
  store.set(CONCEPT_COOKIE_NAME, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
