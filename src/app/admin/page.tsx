"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "@/lib/api";
import type {
  MedicineRequest,
  DashboardStats,
  MedicineRequestCreate,
  RequestStatus,
} from "@/lib/api";

// ─── Browser Notification Helpers ─────────────────────────────────────────────
function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(
  title: string,
  body: string,
  tag?: string
) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  try {
    new Notification(title, {
      body,
      icon: "/images/logo.png",
      badge: "/images/logo.png",
      tag: tag ?? "safdar-pharma",
    });
  } catch {
    // Safari / older browsers may throw
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<
  RequestStatus | "all",
  { label: string; bg: string; text: string; dot: string }
> = {
  all:       { label: "All",       bg: "bg-slate-100",   text: "text-slate-600",  dot: "bg-slate-400"  },
  pending:   { label: "Pending",   bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-400"  },
  arrived:   { label: "Arrived",   bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-400"   },
  notified:  { label: "Notified",  bg: "bg-purple-50",   text: "text-purple-700", dot: "bg-purple-400" },
  collected: { label: "Collected", bg: "bg-emerald-50",  text: "text-emerald-700",dot: "bg-emerald-400"},
  cancelled: { label: "Cancelled", bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-400"    },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function fmt(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────
const STAT_CARDS = [
  { key: "total",     label: "Total",     color: "from-slate-700 to-slate-900",     icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "pending",   label: "Pending",   color: "from-amber-500 to-orange-600",    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "arrived",   label: "Arrived",   color: "from-blue-500 to-indigo-600",     icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { key: "notified",  label: "Notified",  color: "from-purple-500 to-violet-600",   icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { key: "collected", label: "Collected", color: "from-emerald-500 to-teal-600",    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "cancelled", label: "Cancelled", color: "from-red-500 to-rose-600",        icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
] as const;

// ─── Request Form Modal ───────────────────────────────────────────────────────
interface ModalProps {
  mode: "create" | "edit";
  initial?: MedicineRequest | null;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY_FORM: MedicineRequestCreate = {
  customerName: "",
  phone: "+92",
  medicineName: "",
  quantity: 1,
  supplierName: "",
  companyName: "",
  notes: "",
};

function RequestModal({ mode, initial, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<MedicineRequestCreate>(
    initial
      ? {
          customerName: initial.customerName,
          phone:         initial.phone,
          medicineName:  initial.medicineName,
          quantity:      initial.quantity,
          supplierName:  initial.supplierName,
          companyName:   initial.companyName ?? "",
          notes:         initial.notes ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof MedicineRequestCreate, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (mode === "create") {
        await api.createRequest(form);
      } else if (initial) {
        await api.updateRequest(initial.id, form);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-[15px] font-semibold text-text-dark">
              {mode === "create" ? "New Medicine Request" : "Edit Request"}
            </h2>
            <p className="text-[12px] text-text-muted mt-0.5">
              {mode === "create" ? "Add a new request to the queue" : `Editing request #${initial?.id.slice(-6)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text-dark"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-100 rounded-xl">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Customer Name *</label>
              <input
                required value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="Ali Khan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Phone Number *</label>
              <input
                required value={form.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  // Prevent removing the +92 prefix
                  if (!val.startsWith("+92")) {
                    set("phone", "+92");
                  } else {
                    set("phone", val);
                  }
                }}
                placeholder="+923001234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Quantity *</label>
              <input
                required type="number" min={1} value={form.quantity}
                onChange={(e) => set("quantity", parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Medicine Name *</label>
              <input
                required value={form.medicineName}
                onChange={(e) => set("medicineName", e.target.value)}
                placeholder="Panadol 500mg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Supplier Name *</label>
              <input
                required value={form.supplierName}
                onChange={(e) => set("supplierName", e.target.value)}
                placeholder="PharmEvo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Company Name *</label>
              <input
                required value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="GSK, Sanofi, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Notes</label>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Any special instructions…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Saving…</>
              ) : (
                mode === "create" ? "Create Request" : "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  request,
  onClose,
  onAction,
}: {
  request: MedicineRequest;
  onClose: () => void;
  onAction: (action: "arrived" | "notify" | "collected" | "delete" | "edit") => void;
}) {
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<api.NotifyResponse | null>(null);

  async function handleNotify() {
    setNotifyLoading(true);
    try {
      const res = await api.notifyCustomer(request.id);
      setNotifyResult(res);
      onAction("notify");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Notification failed");
    } finally {
      setNotifyLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-[15px] font-semibold text-text-dark">Request Details</h2>
            <p className="text-[11px] text-text-muted mt-0.5 font-mono">#{request.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg text-text-muted hover:text-text-dark transition-colors ml-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Customer info */}
          <div className="bg-bg rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Customer</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-dark">{request.customerName}</p>
                <a href={`tel:${request.phone}`} className="text-[12px] text-primary hover:underline">{request.phone}</a>
              </div>
            </div>
          </div>

          {/* Medicine info */}
          <div className="bg-bg rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Medicine</p>
            <div className="space-y-2">
              <Row label="Name"     value={request.medicineName} />
              <Row label="Quantity" value={`${request.quantity} unit${request.quantity > 1 ? "s" : ""}`} />
              <Row label="Supplier" value={request.supplierName} />
              <Row label="Company" value={request.companyName || "—"} />
              {request.notes && <Row label="Notes" value={request.notes} />}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-bg rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Timeline</p>
            <div className="space-y-2">
              <Row label="Created"   value={fmt(request.createdAt)} />
              <Row label="Arrived"   value={fmt(request.arrivedAt)} />
              <Row label="Notified"  value={fmt(request.notifiedAt)} />
              <Row label="Collected" value={fmt(request.collectedAt)} />
            </div>
          </div>

          {/* Notify result */}
          {notifyResult && (
            <a
              href={notifyResult.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 bg-[#25d366]/10 border border-[#25d366]/30 rounded-2xl hover:bg-[#25d366]/15 transition-colors"
            >
              <svg className="w-6 h-6 text-[#25d366] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#128C7E]">Open WhatsApp</p>
                <p className="text-[11px] text-[#128C7E]/70 truncate">Tap to send message to {request.customerName}</p>
              </div>
              <svg className="w-4 h-4 text-[#25d366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-border-soft space-y-2.5 sticky bottom-0 bg-white">
          {request.status === "pending" && (
            <button
              onClick={() => onAction("arrived")}
              className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Mark as Arrived
            </button>
          )}
          {(request.status === "arrived") && (
            <button
              onClick={handleNotify}
              disabled={notifyLoading}
              className="w-full py-2.5 rounded-xl bg-[#25d366] text-white text-[13px] font-medium hover:bg-[#1ebe5d] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {notifyLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              )}
              {notifyLoading ? "Generating…" : "Notify via WhatsApp"}
            </button>
          )}
          {request.status === "notified" && (
            <button
              onClick={() => onAction("collected")}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Mark as Collected
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onAction("edit")}
              className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              Edit
            </button>
            <button
              onClick={() => onAction("delete")}
              className="flex-1 py-2.5 rounded-xl border border-red-100 bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[12px] text-text-muted shrink-0">{label}</span>
      <span className="text-[12px] text-text-dark font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({
  request,
  onClose,
  onDeleted,
}: {
  request: MedicineRequest;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteRequest(request.id);
      onDeleted();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-text-dark">Delete Request?</h3>
            <p className="text-[12px] text-text-muted mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-bg rounded-xl px-4 py-3">
          <p className="text-[12px] text-text-dark font-medium">{request.medicineName}</p>
          <p className="text-[11px] text-text-muted mt-0.5">{request.customerName} · {request.supplierName}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {deleting ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> : null}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Summary View (grouped by Supplier) ────────────────────────────────
interface SupplierGroup {
  supplierName: string;
  medicines: {
    medicineName: string;
    companyName: string;
    totalQty: number;
    customers: string[];
    status: RequestStatus;
  }[];
  totalItems: number;
}

function OrderSummaryView({
  requests,
  loading,
}: {
  requests: MedicineRequest[];
  loading: boolean;
}) {
  // Only show pending + arrived (not yet collected/cancelled)
  const activeRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "arrived"
  );

  // Group by supplier
  const grouped: SupplierGroup[] = [];
  const supplierMap = new Map<string, SupplierGroup>();

  for (const req of activeRequests) {
    const key = req.supplierName.toLowerCase().trim();
    if (!supplierMap.has(key)) {
      const group: SupplierGroup = {
        supplierName: req.supplierName,
        medicines: [],
        totalItems: 0,
      };
      supplierMap.set(key, group);
      grouped.push(group);
    }
    const group = supplierMap.get(key)!;

    // Check if same medicine + company already exists under this supplier
    const medKey = `${req.medicineName.toLowerCase().trim()}|${(req.companyName || "").toLowerCase().trim()}`;
    let med = group.medicines.find(
      (m) =>
        `${m.medicineName.toLowerCase().trim()}|${(m.companyName || "").toLowerCase().trim()}` ===
        medKey
    );
    if (!med) {
      med = {
        medicineName: req.medicineName,
        companyName: req.companyName || "",
        totalQty: 0,
        customers: [],
        status: req.status,
      };
      group.medicines.push(med);
    }
    med.totalQty += req.quantity;
    if (!med.customers.includes(req.customerName)) {
      med.customers.push(req.customerName);
    }
    group.totalItems += req.quantity;
  }

  // Sort suppliers alphabetically
  grouped.sort((a, b) => a.supplierName.localeCompare(b.supplierName));

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border-soft p-6 space-y-3">
            <div className="h-5 w-40 bg-bg rounded-full animate-pulse" />
            <div className="h-4 w-full bg-bg rounded-full animate-pulse" />
            <div className="h-4 w-3/4 bg-bg rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border-soft py-16 text-center">
        <svg className="w-10 h-10 text-text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[13px] text-text-muted font-medium">No pending orders</p>
        <p className="text-[12px] text-text-muted/60 mt-1">All medicines have been collected or cancelled</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-muted">
        Showing <span className="font-semibold text-text-dark">{grouped.length}</span> supplier{grouped.length !== 1 ? "s" : ""} with pending / arrived orders
      </p>

      {grouped.map((group) => (
        <div
          key={group.supplierName}
          className="bg-white rounded-2xl border border-border-soft shadow-sm overflow-hidden"
        >
          {/* Supplier header */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-border-soft flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-text-dark">{group.supplierName}</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {group.medicines.length} medicine{group.medicines.length !== 1 ? "s" : ""} · {group.totalItems} total unit{group.totalItems !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Medicines table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg/60">
                  {["Medicine", "Company", "Total Qty", "Requested By", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider first:pl-6 last:pr-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {group.medicines.map((med, idx) => (
                  <tr key={idx} className="hover:bg-bg/40 transition-colors">
                    <td className="px-5 py-3.5 pl-6">
                      <p className="text-[13px] font-semibold text-text-dark">{med.medicineName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-text-soft">{med.companyName || "—"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[13px] font-bold">
                        {med.totalQty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[12px] text-text-muted">
                        {med.customers.join(", ")}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 pr-6">
                      <StatusBadge status={med.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "orderSummary">("requests");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editRequest, setEditRequest] = useState<MedicineRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<MedicineRequest | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<MedicineRequest | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // ─── Request notification permission on mount ──────────────────────────────
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // ─── Real-time Firestore subscription ──────────────────────────────────────
  useEffect(() => {
    const unsub = api.subscribeToRequests((allRequests) => {
      // Detect NEW requests (ones we haven't seen before)
      if (initialLoadDone.current) {
        for (const req of allRequests) {
          if (!knownIdsRef.current.has(req.id)) {
            showBrowserNotification(
              "🆕 New Medicine Request",
              `${req.customerName} requested ${req.medicineName} (Qty: ${req.quantity}) from ${req.supplierName}`,
              `new-req-${req.id}`
            );
          }
        }
      }

      // Update known IDs
      knownIdsRef.current = new Set(allRequests.map((r) => r.id));
      initialLoadDone.current = true;

      // Apply client-side filters
      let filtered = allRequests;
      if (statusFilter && statusFilter !== "all") {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.customerName.toLowerCase().includes(s) ||
            r.medicineName.toLowerCase().includes(s) ||
            r.supplierName.toLowerCase().includes(s) ||
            r.phone.includes(s)
        );
      }

      setRequests(filtered);
      setTotal(filtered.length);
      setLoading(false);

      // Also refresh stats
      api.getDashboardStats().then(setStats).catch(() => {});
      setStatsLoading(false);
    });

    return () => unsub();
  }, [search, statusFilter]);

  // ─── Periodic reminder for pending requests (every 30 minutes) ─────────────
  useEffect(() => {
    const REMINDER_INTERVAL = 30 * 60 * 1000; // 30 minutes

    const intervalId = setInterval(() => {
      const pendingCount = requests.filter(
        (r) => r.status === "pending"
      ).length;
      if (pendingCount > 0) {
        showBrowserNotification(
          "⏰ Pending Medicine Reminder",
          `You have ${pendingCount} pending medicine request${pendingCount > 1 ? "s" : ""} waiting to be marked as arrived.`,
          "pending-reminder"
        );
      }
    }, REMINDER_INTERVAL);

    return () => clearInterval(intervalId);
  }, [requests]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await api.getDashboardStats();
      setStats(s);
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async (q?: string, st?: string) => {
    setLoading(true);
    try {
      const res = await api.getRequests(q, st);
      setRequests(res.requests);
      setTotal(res.total);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Note: initial load + search/filter now handled by the real-time subscription above.
  // These functions are kept for manual refresh and post-action refreshes.

  // Note: initial load + search/filter are handled by the real-time subscription.
  // The old useEffect hooks for loadStats/loadRequests and debounced search
  // have been replaced by the onSnapshot listener above.

  async function handleMarkArrived(req: MedicineRequest) {
    setActionLoading(req.id + "-arrived");
    try {
      const updated = await api.markArrived(req.id);
      setRequests((rs) => rs.map((r) => (r.id === req.id ? updated : r)));
      if (detailRequest?.id === req.id) setDetailRequest(updated);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkCollected(req: MedicineRequest) {
    setActionLoading(req.id + "-collected");
    try {
      const updated = await api.markCollected(req.id);
      setRequests((rs) => rs.map((r) => (r.id === req.id ? updated : r)));
      if (detailRequest?.id === req.id) setDetailRequest(updated);
      await loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  function refresh() {
    loadStats();
    loadRequests(search, statusFilter === "all" ? undefined : statusFilter);
  }

  function handleDetailAction(
    action: "arrived" | "notify" | "collected" | "delete" | "edit",
    req: MedicineRequest
  ) {
    if (action === "arrived")   handleMarkArrived(req);
    if (action === "collected") handleMarkCollected(req);
    if (action === "edit")      { setDetailRequest(null); setEditRequest(req); }
    if (action === "delete")    { setDetailRequest(null); setDeleteRequest(req); }
    if (action === "notify")    refresh();
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-dark tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-text-muted mt-1">
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-dark shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Request
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => {
          const value = stats ? (stats as unknown as Record<string, number>)[card.key] : null;
          return (
            <button
              key={card.key}
              onClick={() => setStatusFilter(card.key === "total" ? "all" : (card.key as RequestStatus))}
              className={`relative overflow-hidden bg-gradient-to-br ${card.color} rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
            >
              <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-30 transition-opacity">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">{card.label}</p>
              <p className="text-3xl font-bold text-white mt-1">
                {statsLoading ? (
                  <span className="inline-block w-8 h-7 bg-white/20 rounded animate-pulse" />
                ) : (
                  value ?? 0
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-1 bg-bg rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "requests"
              ? "bg-white text-text-dark shadow-sm"
              : "text-text-muted hover:text-text-dark"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            All Requests
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orderSummary")}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "orderSummary"
              ? "bg-white text-text-dark shadow-sm"
              : "text-text-muted hover:text-text-dark"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Order Summary
          </span>
        </button>
      </div>

      {/* ── Order Summary (grouped by Supplier) ── */}
      {activeTab === "orderSummary" && (
        <OrderSummaryView requests={requests} loading={loading} />
      )}

      {/* ── Requests Table ── */}
      {activeTab === "requests" && (
      <div className="bg-white rounded-2xl border border-border-soft shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-border-soft flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-text-dark">Medicine Requests</h2>
            <p className="text-[12px] text-text-muted mt-0.5">{total} request{total !== 1 ? "s" : ""} found</p>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, medicine, supplier…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(STATUS_META) as (RequestStatus | "all")[]).map((s) => {
              const m = STATUS_META[s];
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                    active
                      ? `${m.bg} ${m.text} ring-1 ring-current/20`
                      : "text-text-muted hover:bg-bg"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-soft hover:bg-bg text-text-muted hover:text-text-dark transition-all"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-bg/60">
                {["Customer", "Medicine", "Qty", "Supplier", "Company", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider first:pl-6 last:pr-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4 first:pl-6 last:pr-6">
                        <div className="h-4 bg-bg rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <svg className="w-10 h-10 text-text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-[13px] text-text-muted font-medium">No requests found</p>
                    <p className="text-[12px] text-text-muted/60 mt-1">
                      {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create a new request to get started"}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-bg/40 transition-colors cursor-pointer group"
                    onClick={() => setDetailRequest(req)}
                  >
                    <td className="px-5 py-3.5 pl-6">
                      <div>
                        <p className="text-[13px] font-semibold text-text-dark">{req.customerName}</p>
                        <p className="text-[11px] text-text-muted">{req.phone}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-text-dark">{req.medicineName}</p>
                      {req.notes && <p className="text-[11px] text-text-muted truncate max-w-[160px]">{req.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-semibold text-text-dark">{req.quantity}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-text-soft">{req.supplierName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-text-soft">{req.companyName || "—"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] text-text-muted">{fmtDate(req.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 pr-6">
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {req.status === "pending" && (
                          <ActionBtn
                            title="Mark Arrived"
                            color="blue"
                            loading={actionLoading === req.id + "-arrived"}
                            onClick={() => handleMarkArrived(req)}
                            icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        )}
                        {req.status === "notified" && (
                          <ActionBtn
                            title="Mark Collected"
                            color="green"
                            loading={actionLoading === req.id + "-collected"}
                            onClick={() => handleMarkCollected(req)}
                            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                        <ActionBtn
                          title="Edit"
                          color="default"
                          onClick={() => setEditRequest(req)}
                          icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                        <ActionBtn
                          title="Delete"
                          color="red"
                          onClick={() => setDeleteRequest(req)}
                          icon="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && requests.length > 0 && (
          <div className="px-6 py-3.5 border-t border-border-soft bg-bg/30 flex items-center justify-between">
            <p className="text-[12px] text-text-muted">
              Showing <span className="font-semibold text-text-dark">{requests.length}</span> of <span className="font-semibold text-text-dark">{total}</span> requests
            </p>
            <p className="text-[11px] text-text-muted">Click a row to view details</p>
          </div>
        )}
      </div>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <RequestModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={refresh}
        />
      )}
      {editRequest && (
        <RequestModal
          mode="edit"
          initial={editRequest}
          onClose={() => setEditRequest(null)}
          onSave={refresh}
        />
      )}
      {detailRequest && (
        <DetailDrawer
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          onAction={(action) => handleDetailAction(action, detailRequest)}
        />
      )}
      {deleteRequest && (
        <DeleteConfirm
          request={deleteRequest}
          onClose={() => setDeleteRequest(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}

// ─── Tiny Action Button ───────────────────────────────────────────────────────
function ActionBtn({
  title,
  color,
  onClick,
  icon,
  loading,
}: {
  title: string;
  color: "blue" | "green" | "red" | "default";
  onClick: () => void;
  icon: string;
  loading?: boolean;
}) {
  const colors = {
    blue:    "text-blue-500 hover:bg-blue-50",
    green:   "text-emerald-500 hover:bg-emerald-50",
    red:     "text-red-500 hover:bg-red-50",
    default: "text-text-muted hover:bg-bg",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={loading}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${colors[color]} disabled:opacity-40`}
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      )}
    </button>
  );
}
