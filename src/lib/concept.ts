/**
 * Concept (multi-tenant scope) helpers.
 *
 * Two cases:
 *   - Manager: their `concept` is fixed by user_profiles.concept (set at invite
 *     time). They cannot switch.
 *   - Owner: cross-concept by default. An owner can pin the dashboard to a
 *     single concept via cookie. Default is "japonesa" since v1 only has that
 *     concept's data; once Alamat / Tryst go live the owner can switch.
 *
 * Use `getActiveConcept(profile)` from server components / API routes to
 * resolve the concept that should filter all queries. The cookie-setter
 * server action lives in `concept-actions.ts`.
 */

import { cookies } from "next/headers";
import type { UserProfile } from "./auth";

export const CONCEPT_COOKIE_NAME = "active_concept";
const VALID_CONCEPTS = ["japonesa", "alamat", "tryst"] as const;
export type Concept = (typeof VALID_CONCEPTS)[number];

export const ALL_CONCEPTS: readonly Concept[] = VALID_CONCEPTS;

export function isValidConcept(s: string | undefined): s is Concept {
  return !!s && (VALID_CONCEPTS as readonly string[]).includes(s);
}

/**
 * Resolve the active concept for the current request.
 * - Managers always get their fixed profile.concept (cookie ignored).
 * - Owners get the cookie value if valid, else default "japonesa".
 */
export async function getActiveConcept(profile: UserProfile): Promise<Concept> {
  if (profile.role === "manager" && isValidConcept(profile.concept ?? undefined)) {
    return profile.concept as Concept;
  }
  const store = await cookies();
  const cookieValue = store.get(CONCEPT_COOKIE_NAME)?.value;
  if (isValidConcept(cookieValue)) return cookieValue;
  return "japonesa";
}
