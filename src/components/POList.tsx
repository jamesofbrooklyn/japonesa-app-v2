"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { php } from "@/lib/kpis";
import { TableSkeleton } from "./Skeleton";

interface PO {
  id: string;
  po_number: string;
  status: string;
  ordered_at: string;
  expected_at: string | null;
  received_at: string | null;
  total: number;
  notes: string | null;
  suppliers: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-200 text-stone-700",
  approved: "bg-blue-100 text-blue-800",
  sent: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-800",
  logged: "bg-stone-100 text-stone-500",
  cancelled: "bg-red-100 text-red-800",
};

const NEXT_ACTIONS: Record<string, { label: string; action: string }[]> = {
  draft: [
    { label: "Approve", action: "approve" },
    { label: "Cancel", action: "cancel" },
  ],
  approved: [
    { label: "Mark Sent", action: "send" },
    { label: "Cancel", action: "cancel" },
  ],
  sent: [
    { label: "Mark Received", action: "receive" },
    { label: "Cancel", action: "cancel" },
  ],
  received: [{ label: "Log", action: "log" }],
};

export default function POList({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/purchase-orders?status=${statusFilter}`
      : "/api/purchase-orders";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  async function handleAction(poId: string, action: string) {
    if (action === "cancel" && !confirm("Cancel this PO?")) return;
    setActing(poId);

    const res = await fetch(`/api/purchase-orders?id=${poId}&action=${action}`, {
      method: "PATCH",
    });

    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) =>
        prev.map((po) => (po.id === poId ? { ...po, status: updated.status } : po))
      );
    }
    setActing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-stone-700">Purchase Orders</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-stone-300 px-2 py-1 text-xs"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="received">Received</option>
          <option value="logged">Logged</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={7} />
      ) : orders.length === 0 ? (
        <div className="text-sm text-stone-400">No purchase orders found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">PO #</th>
                <th className="text-left px-3 py-2">Supplier</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Ordered</th>
                <th className="text-left px-3 py-2">Expected</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium tabular-nums">{po.po_number}</td>
                  <td className="px-3 py-2">{po.suppliers?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                        STATUS_COLORS[po.status] || "bg-stone-100"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                    {po.ordered_at?.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                    {po.expected_at?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {php(Number(po.total))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {(NEXT_ACTIONS[po.status] || []).map((na) => {
                        // Only owners can approve
                        if (na.action === "approve" && !isOwner) return null;
                        return (
                          <button
                            key={na.action}
                            onClick={() => handleAction(po.id, na.action)}
                            disabled={acting === po.id}
                            className={`text-xs px-2 py-1 rounded transition disabled:opacity-50 ${
                              na.action === "cancel"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-blue-700 hover:bg-blue-50"
                            }`}
                          >
                            {na.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
