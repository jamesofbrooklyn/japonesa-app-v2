"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveConcept } from "@/lib/concept-actions";

interface ConceptSwitcherProps {
  currentConcept: string;
  options: readonly string[];
}

const LABELS: Record<string, string> = {
  japonesa: "Japonesa",
  alamat: "Alamat",
  tryst: "Tryst",
};

export default function ConceptSwitcher({ currentConcept, options }: ConceptSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(currentConcept);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    startTransition(async () => {
      await setActiveConcept(next);
      router.refresh();
    });
  }

  return (
    <div className="px-3 py-2 mb-4 rounded border border-stone-200 bg-stone-50">
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
        Active concept
      </div>
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm font-semibold text-japonesa-red disabled:opacity-50"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {LABELS[c] ?? c}
          </option>
        ))}
      </select>
      {pending && (
        <div className="text-[10px] text-stone-500 mt-1">Switching…</div>
      )}
    </div>
  );
}
