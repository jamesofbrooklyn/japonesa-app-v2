"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

export default function InviteForm() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "manager">("manager");
  const [concept, setConcept] = useState("japonesa");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        display_name: displayName,
        password,
        role,
        concept: role === "owner" ? null : concept,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Invited ${data.display_name} (${data.email})`);
    setEmail("");
    setDisplayName("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Display name
        </label>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent"
          placeholder="e.g. Chef Marco"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent"
          placeholder="marco@japonesa.ph"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Temporary password
        </label>
        <input
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent"
          placeholder="Min 6 characters"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "owner" | "manager")}
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent"
          >
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        {role === "manager" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Concept
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent"
            >
              <option value="japonesa">Japonesa</option>
              <option value="alamat">Alamat</option>
              <option value="tryst">Tryst</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Inviting..." : "Invite user"}
      </button>
    </form>
  );
}
