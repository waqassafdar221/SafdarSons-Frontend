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

function isSameLocalDay(dateStr: string, refDate = new Date()) {
  const d = new Date(dateStr);
  return (
    d.getDate() === refDate.getDate() &&
    d.getMonth() === refDate.getMonth() &&
    d.getFullYear() === refDate.getFullYear()
  );
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
  phone: "",
  medicineName: "",
  quantity: 1,
  supplierName: "",
  companyName: "",
  notes: "",
  expectedDate: "",
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
          expectedDate:  initial.expectedDate ?? "",
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
    if (!/^\d{11}$/.test(form.phone)) {
      setError("Phone number must be exactly 11 digits.");
      return;
    }
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
                required
                type="text"
                inputMode="numeric"
                pattern="\d{11}"
                minLength={11}
                maxLength={11}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="03001234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <p className="text-[10px] text-text-muted">Enter exactly 11 digits</p>
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
              <label className="text-[12px] font-medium text-text-dark">Expected Supply Date</label>
              <input
                type="date"
                value={form.expectedDate ?? ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("expectedDate", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
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
              <Row label="Expected Date" value={request.expectedDate ? fmtDate(request.expectedDate) : "—"} />
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

// ─── Customer Ledger View ────────────────────────────────────────────────────
function CustomerLedgerView() {
  const [customers, setCustomers] = useState<api.Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<api.Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Add customer form
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState("");

  // Edit customer form
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState({ name: "", phone: "", address: "" });
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState("");
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Ledger entries
  const [entries, setEntries] = useState<api.LedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [allLedgerEntries, setAllLedgerEntries] = useState<api.LedgerEntry[]>([]);

  // Add transaction form
  const [entryType, setEntryType] = useState<api.LedgerEntryType>("credit");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [addEntryError, setAddEntryError] = useState("");

  // Edit transaction form
  const [editEntryTarget, setEditEntryTarget] = useState<api.LedgerEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<{
    type: api.LedgerEntryType;
    amount: string;
    note: string;
    password: string;
  }>({
    type: "credit",
    amount: "",
    note: "",
    password: "",
  });
  const [editEntryError, setEditEntryError] = useState("");
  const [editingEntry, setEditingEntry] = useState(false);
  const [showEditEntryPassword, setShowEditEntryPassword] = useState(false);

  // Subscribe to customers
  useEffect(() => {
    const unsub = api.subscribeToCustomers((data) => {
      setCustomers(data);
      setLoadingCustomers(false);
    });
    return () => unsub();
  }, []);

  // Keep selectedCustomer in sync with live balance updates
  useEffect(() => {
    if (!selectedCustomer) return;
    const updated = customers.find((c) => c.id === selectedCustomer.id);
    if (updated) {
      setSelectedCustomer(updated);
      setEditCustomer({
        name: updated.name,
        phone: updated.phone ?? "",
        address: updated.address ?? "",
      });
    } else {
      setSelectedCustomer(null);
      setShowEditCustomer(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // Subscribe to selected customer's ledger entries
  useEffect(() => {
    if (!selectedCustomer) return;
    setLoadingEntries(true);
    const unsub = api.subscribeToLedgerEntries(selectedCustomer.id, (data) => {
      setEntries(data);
      setLoadingEntries(false);
    });
    return () => unsub();
  }, [selectedCustomer?.id]);

  // Subscribe to all customer ledger entries for global daily reminder ticker
  useEffect(() => {
    const unsub = api.subscribeToAllLedgerEntries((data) => {
      setAllLedgerEntries(data);
    });
    return () => unsub();
  }, []);

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setAddCustomerError("");
    if (!newCustomer.name.trim()) { setAddCustomerError("Name is required."); return; }
    setAddingCustomer(true);
    try {
      const createdCustomer = await api.addCustomer(newCustomer);
      setNewCustomer({ name: "", phone: "", address: "" });
      setShowAddCustomer(false);
      setSelectedCustomer(createdCustomer);
    } catch (err) {
      setAddCustomerError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingCustomer(false);
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setAddEntryError("");
    const amount = parseFloat(entryAmount);
    if (!entryAmount || isNaN(amount) || amount <= 0) {
      setAddEntryError("Enter a valid positive amount.");
      return;
    }
    if (!entryNote.trim()) {
      setAddEntryError("Note is required.");
      return;
    }
    setAddingEntry(true);
    try {
      await api.addLedgerEntry({
        customerId: selectedCustomer.id,
        type: entryType,
        amount,
        note: entryNote.trim(),
      });
      setEntryAmount("");
      setEntryNote("");
    } catch (err) {
      setAddEntryError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingEntry(false);
    }
  }

  function openEditCustomer() {
    if (!selectedCustomer) return;
    setEditCustomer({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone ?? "",
      address: selectedCustomer.address ?? "",
    });
    setEditCustomerError("");
    setShowEditCustomer(true);
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setEditCustomerError("");
    if (!editCustomer.name.trim()) {
      setEditCustomerError("Name is required.");
      return;
    }
    setEditingCustomer(true);
    try {
      await api.updateCustomer(selectedCustomer.id, {
        name: editCustomer.name.trim(),
        phone: editCustomer.phone.trim(),
        address: editCustomer.address.trim(),
      });
      setShowEditCustomer(false);
    } catch (err) {
      setEditCustomerError(err instanceof Error ? err.message : "Failed");
    } finally {
      setEditingCustomer(false);
    }
  }

  async function handleDeleteCustomer() {
    if (!selectedCustomer || deletingCustomer) return;
    const ok = window.confirm(
      `Remove ${selectedCustomer.name}? This will also delete all ledger transactions for this customer.`
    );
    if (!ok) return;
    setDeletingCustomer(true);
    try {
      await api.deleteCustomer(selectedCustomer.id);
      setSelectedCustomer(null);
      setEntries([]);
      setShowEditCustomer(false);
    } finally {
      setDeletingCustomer(false);
    }
  }

  function openEditEntry(entry: api.LedgerEntry) {
    setEditEntryTarget(entry);
    setEditEntryForm({
      type: entry.type,
      amount: String(entry.amount),
      note: entry.note ?? "",
      password: "",
    });
    setEditEntryError("");
    setShowEditEntryPassword(false);
  }

  async function handleEditEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !editEntryTarget) return;

    setEditEntryError("");
    const amount = parseFloat(editEntryForm.amount);
    if (!editEntryForm.amount || isNaN(amount) || amount <= 0) {
      setEditEntryError("Enter a valid positive amount.");
      return;
    }
    if (!editEntryForm.password.trim()) {
      setEditEntryError("Admin password is required.");
      return;
    }

    setEditingEntry(true);
    try {
      await api.reauthenticate(editEntryForm.password);
      await api.updateLedgerEntry(editEntryTarget.id, {
        customerId: selectedCustomer.id,
        type: editEntryForm.type,
        amount,
        note: editEntryForm.note.trim() || undefined,
      });
      setEditEntryTarget(null);
      setEditEntryError("");
      setShowEditEntryPassword(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setEditEntryError(
        msg.includes("auth") || msg.includes("password") || msg.includes("wrong") || msg.includes("credential")
          ? "Incorrect password. Please try again."
          : msg
      );
    } finally {
      setEditingEntry(false);
    }
  }

  function handlePrint() {
    if (!selectedCustomer || entries.length === 0) return;

    // Sort oldest-first to compute running balance
    const sorted = [...entries].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tA - tB;
    });

    // Find last settlement (last index where running balance reached 0)
    let runningBalance = 0;
    let lastSettledIndex = -1;
    sorted.forEach((entry, i) => {
      runningBalance += entry.type === "credit" ? entry.amount : -entry.amount;
      if (runningBalance === 0) lastSettledIndex = i;
    });

    const printEntries = lastSettledIndex >= 0 ? sorted.slice(lastSettledIndex + 1) : sorted;

    const printDate = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
    const printTime = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

    const printCredit  = printEntries.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0);
    const printDebit   = printEntries.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0);
    const printBalance = printCredit - printDebit;

    const fmtD = (dateStr?: string) =>
      dateStr ? new Date(dateStr).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const rows = printEntries.map((e) =>
      `<tr>
        <td>${fmtD(e.createdAt)}</td>
        <td>${e.type === "credit" ? "Credit" : "Debit"}</td>
        <td style="text-align:right;">${e.type === "credit" ? "+" : "-"}Rs ${e.amount.toLocaleString()}</td>
        <td>${e.note ?? ""}</td>
      </tr>`
    ).join("");

    const balanceLabel =
      printBalance > 0 ? "AMOUNT DUE" :
      printBalance < 0 ? "ADVANCE PAID" :
      "ACCOUNT SETTLED";
    const balanceDisplay =
      printBalance === 0 ? "SETTLED \u2714" : `Rs ${Math.abs(printBalance).toLocaleString()}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt - ${selectedCustomer.name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Tahoma','Arial',Helvetica,sans-serif; font-size:11.5px; line-height:1.55; width:72mm; margin:0 auto; padding:4mm 3mm; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.center { text-align:center; }
.divider { border-top:1px dashed #000; margin:6px 0; }
.store-name { font-size:14.5px; font-weight:700; text-align:center; line-height:1.55; letter-spacing:0.2px; }
.sub { font-size:10.5px; text-align:center; }
table { width:100%; border-collapse:collapse; margin-top:5px; }
th { font-size:9.5px; font-weight:700; text-align:left; border-bottom:1.5px solid #000; padding:3px 2px; letter-spacing:0.3px; text-transform:uppercase; }
td { font-size:10.5px; padding:3px 2px; vertical-align:top; word-break:break-word; line-height:1.45; }
.bold { font-weight:700; }
.totals-row td { font-weight:700; border-top:1.5px solid #000; padding-top:5px; }
.balance-box { margin-top:6px; padding:6px 4px; border:1.5px solid #000; text-align:center; }
.balance-label { font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
.balance-amount { font-size:17px; font-weight:700; margin-top:3px; letter-spacing:0.5px; }
@media print { body { width:72mm; } @page { size:72mm auto; margin:2mm; } }
</style></head><body>
<p class="store-name">Safdar &amp; Sons Pharma<br>+ Veterinary Store</p>
<p class="sub">Contact: 03062088148</p>
<div class="divider"></div>
<p class="center sub">Printed: ${printDate}, ${printTime}</p>
<div class="divider"></div>
<p class="bold" style="margin-bottom:2px;">Customer</p>
<p>${selectedCustomer.name}</p>
${selectedCustomer.phone ? `<p class="sub" style="text-align:left;">Ph: ${selectedCustomer.phone}</p>` : ""}
${selectedCustomer.address ? `<p class="sub" style="text-align:left;">${selectedCustomer.address}</p>` : ""}
<div class="divider"></div>
<p class="bold" style="font-size:9px;margin-bottom:2px;">TRANSACTIONS SINCE LAST SETTLEMENT</p>
<p class="sub" style="text-align:left;margin-bottom:2px;">${printEntries.length} transaction${printEntries.length !== 1 ? "s" : ""}</p>
<table>
  <thead><tr>
    <th>Date</th><th>Type</th><th style="text-align:right;">Amount</th><th>Note</th>
  </tr></thead>
  <tbody>${rows}
    <tr class="totals-row">
      <td colspan="2">Total Credit</td>
      <td style="text-align:right;">Rs ${printCredit.toLocaleString()}</td>
      <td></td>
    </tr>
    <tr>
      <td colspan="2" class="bold">Total Debit</td>
      <td style="text-align:right;font-weight:bold;">Rs ${printDebit.toLocaleString()}</td>
      <td></td>
    </tr>
  </tbody>
</table>
<div class="balance-box">
  <p class="balance-label">${balanceLabel}</p>
  <p class="balance-amount">${balanceDisplay}</p>
</div>
<div class="divider"></div>
<p class="center sub" style="margin-top:4px;">Thank you for your business!</p>
</body></html>`;

    const win = window.open("", "_blank", "width=400,height=680");
    if (!win) { alert("Please allow pop-ups to print receipts."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  }

  const filteredCustomers = (customerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.phone ?? "").includes(customerSearch)
      )
    : customers).sort((a, b) => {
      // Customers with balance > 0 or < 0 first, settled (balance === 0) at the end
      if (a.balance === 0 && b.balance !== 0) return 1;
      if (a.balance !== 0 && b.balance === 0) return -1;
      return 0;
    });

  const totalCustomerCredit = customers.reduce(
    (sum, customer) => sum + (customer.balance > 0 ? customer.balance : 0),
    0
  );

  const totalCreditAmount = entries
    .filter((entry) => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const todayLedgerTickerItems = allLedgerEntries
    .filter((entry) => entry.createdAt && isSameLocalDay(entry.createdAt))
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return at - bt;
    })
    .map((entry) => {
      const customerName = customers.find((c) => c.id === entry.customerId)?.name ?? "Unknown Customer";
      return {
        customerId: entry.customerId,
        customerName,
        type: entry.type,
        amount: entry.amount,
      };
    });

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all";

  return (
    <div className="space-y-4">
      {todayLedgerTickerItems.length > 0 && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-50 to-transparent" />

          <div className="overflow-hidden py-2">
            <div
              className="flex w-max items-center whitespace-nowrap text-[12px] font-semibold"
              style={{ animation: "customer-ledger-ticker-loop 60s linear infinite" }}
            >
              {[0, 1].map((loop) => (
                <span key={loop} className="inline-flex items-center px-4" aria-hidden={loop === 1}>
                  {todayLedgerTickerItems.map((item, idx) => (
                    <span key={`${loop}-${item.customerId}-${item.type}-${item.amount}-${idx}`} className="inline-flex items-center">
                      <button
                        type="button"
                        tabIndex={loop === 1 ? -1 : 0}
                        onClick={() => {
                          const targetCustomer = customers.find((c) => c.id === item.customerId);
                          if (targetCustomer) setSelectedCustomer(targetCustomer);
                        }}
                        className={`underline underline-offset-4 decoration-dotted hover:decoration-solid transition-all cursor-pointer ${item.type === "credit" ? "text-rose-600" : "text-emerald-600"}`}
                        title={`Open ${item.customerName} ledger`}
                      >
                        {item.customerName} {item.type === "credit" ? "Credit" : "Debit"}: {item.type === "credit" ? "+" : "−"}Rs {item.amount.toLocaleString()}
                      </button>
                      {idx < todayLedgerTickerItems.length - 1 && (
                        <span className="mx-3 text-slate-300">•</span>
                      )}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:items-start">

      {/* ── Left: Customer List ── */}
      <div className="w-full lg:w-72 lg:shrink-0 space-y-3">
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Customer Credit</p>
          <p className="text-[16px] font-black text-rose-600 mt-0.5">Rs {totalCustomerCredit.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-text-dark">
            Customers <span className="text-text-muted font-normal">({customers.length})</span>
          </h3>
          <button
            onClick={() => { setShowAddCustomer((v) => !v); setAddCustomerError(""); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-[12px] font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showAddCustomer ? "M6 18L18 6M6 6l12 12" : "M12 4.5v15m7.5-7.5h-15"} />
            </svg>
            {showAddCustomer ? "Cancel" : "Add"}
          </button>
        </div>

        {/* Add Customer Form */}
        {showAddCustomer && (
          <form onSubmit={handleAddCustomer} className="bg-white border border-border-soft rounded-2xl p-4 space-y-3 shadow-sm">
            {addCustomerError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{addCustomerError}</p>
            )}
            <input required value={newCustomer.name} onChange={(e) => setNewCustomer((v) => ({ ...v, name: e.target.value }))} placeholder="Customer Name *" className={inputCls} />
            <input value={newCustomer.phone} onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))} placeholder="Phone (optional)" className={inputCls} />
            <input value={newCustomer.address} onChange={(e) => setNewCustomer((v) => ({ ...v, address: e.target.value }))} placeholder="Address (optional)" className={inputCls} />
            <button type="submit" disabled={addingCustomer} className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {addingCustomer && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              {addingCustomer ? "Saving…" : "Save Customer"}
            </button>
          </form>
        )}

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-soft bg-white text-[13px] text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Customer List */}
        <div className="space-y-1.5 max-h-[280px] lg:max-h-[620px] overflow-y-auto pr-1">
          {loadingCustomers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-white rounded-xl border border-border-soft animate-pulse" />
            ))
          ) : filteredCustomers.length === 0 ? (
            <p className="text-[12px] text-text-muted text-center py-8">
              {customerSearch ? "No customers match" : "No customers yet"}
            </p>
          ) : filteredCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedCustomer?.id === c.id
                  ? "bg-primary/5 border-primary/30 shadow-sm"
                  : "bg-white border-border-soft hover:bg-bg"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-dark truncate">{c.name}</p>
                  {c.phone && <p className="text-[11px] text-text-muted">{c.phone}</p>}
                </div>
                <span className={`text-[12px] font-bold shrink-0 ${
                  c.balance > 0 ? "text-rose-600" : c.balance < 0 ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {c.balance > 0
                    ? `Rs ${c.balance.toLocaleString()}`
                    : c.balance < 0
                    ? `-Rs ${Math.abs(c.balance).toLocaleString()}`
                    : "Settled"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Ledger Panel ── */}
      {selectedCustomer ? (
        <div className="flex-1 min-w-0 space-y-4">
          {/* Customer Info + Balance */}
          <div className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-[17px] font-bold text-text-dark">{selectedCustomer.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2">
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1.5 text-[12px] text-text-muted">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      {selectedCustomer.phone}
                    </span>
                  )}
                  {selectedCustomer.address && (
                    <span className="flex items-center gap-1.5 text-[12px] text-text-muted">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {selectedCustomer.address}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
                <div className={`rounded-2xl px-5 py-3 text-right border ${
                  selectedCustomer.balance > 0
                    ? "bg-rose-50 border-rose-100"
                    : selectedCustomer.balance < 0
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-slate-50 border-slate-100"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {selectedCustomer.balance > 0 ? "Owes" : selectedCustomer.balance < 0 ? "Advance Paid" : "Settled"}
                  </p>
                  <p className={`text-[22px] font-black mt-0.5 ${
                    selectedCustomer.balance > 0
                      ? "text-rose-600"
                      : selectedCustomer.balance < 0
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}>
                    {selectedCustomer.balance === 0
                      ? "✔"
                      : `Rs ${Math.abs(selectedCustomer.balance).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={openEditCustomer}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[12px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Edit Customer
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCustomer}
                    disabled={deletingCustomer}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-[12px] font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
                  >
                    {deletingCustomer ? "Removing..." : "Remove Customer"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showEditCustomer && (
            <form onSubmit={handleEditCustomer} className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-[13px] font-semibold text-text-dark">Edit Customer Details</h4>
                <button
                  type="button"
                  onClick={() => { setShowEditCustomer(false); setEditCustomerError(""); }}
                  className="text-[12px] font-semibold text-text-muted hover:text-text-dark transition-colors"
                >
                  Cancel
                </button>
              </div>
              {editCustomerError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editCustomerError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  required
                  value={editCustomer.name}
                  onChange={(e) => setEditCustomer((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Customer Name *"
                  className={inputCls}
                />
                <input
                  value={editCustomer.phone}
                  onChange={(e) => setEditCustomer((v) => ({ ...v, phone: e.target.value }))}
                  placeholder="Phone"
                  className={inputCls}
                />
                <input
                  value={editCustomer.address}
                  onChange={(e) => setEditCustomer((v) => ({ ...v, address: e.target.value }))}
                  placeholder="Address"
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={editingCustomer}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  {editingCustomer ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Add Transaction Form */}
          <form onSubmit={handleAddEntry} className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm space-y-4">
            <h4 className="text-[13px] font-semibold text-text-dark">Add Transaction</h4>
            {addEntryError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{addEntryError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Credit / Debit toggle */}
              <div className="flex rounded-xl border border-border-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEntryType("credit")}
                  className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                    entryType === "credit" ? "bg-rose-500 text-white" : "bg-white text-text-muted hover:bg-bg"
                  }`}
                >
                  + Credit
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("debit")}
                  className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                    entryType === "debit" ? "bg-emerald-500 text-white" : "bg-white text-text-muted hover:bg-bg"
                  }`}
                >
                  − Debit
                </button>
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                placeholder="Amount (Rs)"
                className={inputCls}
              />
              <input
                required
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder="Note / Description *"
                className={inputCls}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={addingEntry} className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center gap-2">
                {addingEntry && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                {addingEntry ? "Saving…" : "Add Transaction"}
              </button>
            </div>
          </form>

          {/* Transaction History Table */}
          <div className="bg-white rounded-2xl border border-border-soft shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-[13px] font-semibold text-text-dark">Transaction History</h4>
                <p className="text-[11px] text-text-muted mt-0.5">{entries.length} transaction{entries.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  Total Credit: Rs {totalCreditAmount.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={entries.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                  Print Receipt
                </button>
              </div>
            </div>
            {loadingEntries ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-bg rounded-lg animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13px] text-text-muted">No transactions yet. Add one above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-bg/60">
                      {["Date", "Type", "Amount", "Note", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-bg/40 transition-colors">
                        <td className="px-5 py-3.5 pl-6 text-[12px] text-text-muted whitespace-nowrap">{fmt(entry.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            entry.type === "credit" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {entry.type === "credit" ? "+ Credit" : "− Debit"}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-[13px] font-bold ${
                          entry.type === "credit" ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          <div>
                            <p>Rs {entry.amount.toLocaleString()}</p>
                            {entry.lastEditedAt && typeof entry.lastEditedAmount === "number" && (
                              <p className="text-[10px] font-medium text-amber-700 mt-0.5">
                                Last edit: Rs {entry.lastEditedAmount.toLocaleString()} → Rs {entry.amount.toLocaleString()} · {fmt(entry.lastEditedAt)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 pr-6 text-[12px] text-text-dark">
                          {entry.note ?? <span className="text-text-muted italic">—</span>}
                        </td>
                        <td className="px-5 py-3.5 pr-6">
                          <button
                            type="button"
                            onClick={() => openEditEntry(entry)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-soft text-[12px] font-medium text-text-soft hover:bg-bg transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {editEntryTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                  if (editingEntry) return;
                  setEditEntryTarget(null);
                  setEditEntryError("");
                }}
              />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <div>
                  <h3 className="text-[15px] font-semibold text-text-dark">Edit Transaction</h3>
                  <p className="text-[12px] text-text-muted mt-0.5">Enter your admin password to update this ledger entry.</p>
                </div>

                <div className="bg-bg rounded-xl px-4 py-3">
                  <p className="text-[13px] font-semibold text-text-dark">{selectedCustomer.name}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {fmt(editEntryTarget.createdAt)} · {editEntryTarget.type === "credit" ? "+ Credit" : "− Debit"} · Rs {editEntryTarget.amount.toLocaleString()}
                  </p>
                </div>

                {editEntryError && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    <p className="text-[12px] text-red-600">{editEntryError}</p>
                  </div>
                )}

                <form onSubmit={handleEditEntry} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 flex rounded-xl border border-border-soft overflow-hidden h-fit">
                      <button
                        type="button"
                        onClick={() => setEditEntryForm((v) => ({ ...v, type: "credit" }))}
                        className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                          editEntryForm.type === "credit" ? "bg-rose-500 text-white" : "bg-white text-text-muted hover:bg-bg"
                        }`}
                      >
                        + Credit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditEntryForm((v) => ({ ...v, type: "debit" }))}
                        className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                          editEntryForm.type === "debit" ? "bg-emerald-500 text-white" : "bg-white text-text-muted hover:bg-bg"
                        }`}
                      >
                        − Debit
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={editEntryForm.amount}
                      onChange={(e) => setEditEntryForm((v) => ({ ...v, amount: e.target.value }))}
                      placeholder="Amount (Rs)"
                      className={inputCls}
                    />
                    <input
                      value={editEntryForm.note}
                      onChange={(e) => setEditEntryForm((v) => ({ ...v, note: e.target.value }))}
                      placeholder="Note / Description"
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-text-dark">Admin Password *</label>
                    <div className="relative">
                      <input
                        required
                        type={showEditEntryPassword ? "text" : "password"}
                        value={editEntryForm.password}
                        onChange={(e) => setEditEntryForm((v) => ({ ...v, password: e.target.value }))}
                        placeholder="Enter your password"
                        className={inputCls + " pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditEntryPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dark"
                      >
                        {showEditEntryPassword
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        }
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingEntry) return;
                        setEditEntryTarget(null);
                        setEditEntryError("");
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editingEntry}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                      {editingEntry && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                      {editingEntry ? "Verifying…" : "Verify & Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-24 text-center bg-white rounded-2xl border border-border-soft shadow-sm">
          <svg className="w-14 h-14 text-text-muted/25 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-[15px] font-semibold text-text-dark">Select a customer</p>
          <p className="text-[12px] text-text-muted mt-1">Click any customer on the left to view and manage their ledger</p>
        </div>
      )}
      </div>

      <style jsx>{`
        @keyframes customer-ledger-ticker-loop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function EmployeeLedgerView() {
  const [employees, setEmployees] = useState<api.Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<api.Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Add employee form
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: "", joiningDate: "", salary: "", phone: "", address: "" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState("");

  // Edit employee form
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [editEmployee, setEditEmployee] = useState({ name: "", joiningDate: "", salary: "", phone: "", address: "" });
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [editEmployeeError, setEditEmployeeError] = useState("");
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  // Ledger entries
  const [entries, setEntries] = useState<api.EmployeeLedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Add transaction form
  const [entryType, setEntryType] = useState<api.LedgerEntryType>("credit");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [addEntryError, setAddEntryError] = useState("");

  useEffect(() => {
    const unsub = api.subscribeToEmployees((data) => {
      setEmployees(data);
      setLoadingEmployees(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;
    const updated = employees.find((e) => e.id === selectedEmployee.id);
    if (updated) {
      setSelectedEmployee(updated);
      setEditEmployee({
        name: updated.name,
        joiningDate: updated.joiningDate,
        salary: String(updated.salary ?? ""),
        phone: updated.phone ?? "",
        address: updated.address ?? "",
      });
    } else {
      setSelectedEmployee(null);
      setShowEditEmployee(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  useEffect(() => {
    if (!selectedEmployee) return;
    setLoadingEntries(true);
    const unsub = api.subscribeToEmployeeLedgerEntries(selectedEmployee.id, (data) => {
      setEntries(data);
      setLoadingEntries(false);
    });
    return () => unsub();
  }, [selectedEmployee?.id]);

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddEmployeeError("");
    if (!newEmployee.name.trim()) {
      setAddEmployeeError("Employee name is required.");
      return;
    }
    if (!newEmployee.joiningDate) {
      setAddEmployeeError("Joining date is required.");
      return;
    }
    const salaryNum = parseFloat(newEmployee.salary);
    if (!newEmployee.salary || isNaN(salaryNum) || salaryNum <= 0) {
      setAddEmployeeError("Enter a valid monthly salary.");
      return;
    }

    setAddingEmployee(true);
    try {
      await api.addEmployee({
        name: newEmployee.name.trim(),
        joiningDate: newEmployee.joiningDate,
        salary: salaryNum,
        phone: newEmployee.phone.trim(),
        address: newEmployee.address.trim(),
      });
      setNewEmployee({ name: "", joiningDate: "", salary: "", phone: "", address: "" });
      setShowAddEmployee(false);
    } catch (err) {
      setAddEmployeeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingEmployee(false);
    }
  }

  function openEditEmployee() {
    if (!selectedEmployee) return;
    setEditEmployee({
      name: selectedEmployee.name,
      joiningDate: selectedEmployee.joiningDate,
      salary: String(selectedEmployee.salary ?? ""),
      phone: selectedEmployee.phone ?? "",
      address: selectedEmployee.address ?? "",
    });
    setEditEmployeeError("");
    setShowEditEmployee(true);
  }

  async function handleEditEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setEditEmployeeError("");

    if (!editEmployee.name.trim()) {
      setEditEmployeeError("Employee name is required.");
      return;
    }
    if (!editEmployee.joiningDate) {
      setEditEmployeeError("Joining date is required.");
      return;
    }
    const editSalaryNum = parseFloat(editEmployee.salary);
    if (!editEmployee.salary || isNaN(editSalaryNum) || editSalaryNum <= 0) {
      setEditEmployeeError("Enter a valid monthly salary.");
      return;
    }

    setEditingEmployee(true);
    try {
      await api.updateEmployee(selectedEmployee.id, {
        name: editEmployee.name.trim(),
        joiningDate: editEmployee.joiningDate,
        salary: editSalaryNum,
        phone: editEmployee.phone.trim(),
        address: editEmployee.address.trim(),
      });
      setShowEditEmployee(false);
    } catch (err) {
      setEditEmployeeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setEditingEmployee(false);
    }
  }

  async function handleDeleteEmployee() {
    if (!selectedEmployee || deletingEmployee) return;
    const ok = window.confirm(
      `Remove ${selectedEmployee.name}? This will also delete all employee ledger transactions.`
    );
    if (!ok) return;

    setDeletingEmployee(true);
    try {
      await api.deleteEmployee(selectedEmployee.id);
      setSelectedEmployee(null);
      setEntries([]);
      setShowEditEmployee(false);
    } finally {
      setDeletingEmployee(false);
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setAddEntryError("");
    const amount = parseFloat(entryAmount);
    if (!entryAmount || isNaN(amount) || amount <= 0) {
      setAddEntryError("Enter a valid positive amount.");
      return;
    }

    setAddingEntry(true);
    try {
      await api.addEmployeeLedgerEntry({
        employeeId: selectedEmployee.id,
        type: entryType,
        amount,
        note: entryNote.trim() || undefined,
      });
      setEntryAmount("");
      setEntryNote("");
    } catch (err) {
      setAddEntryError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingEntry(false);
    }
  }

  const filteredEmployees = (employeeSearch
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          (e.phone ?? "").includes(employeeSearch)
      )
    : employees).sort((a, b) => {
      // Employees with balance > 0 or < 0 first, settled (balance === 0) at the end
      if (a.balance === 0 && b.balance !== 0) return 1;
      if (a.balance !== 0 && b.balance === 0) return -1;
      return 0;
    });

  const totalPayable = employees.reduce(
    (sum, employee) => sum + (employee.balance > 0 ? employee.balance : 0),
    0
  );

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all";

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch lg:items-start">
      <div className="w-full lg:w-72 lg:shrink-0 space-y-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Total Employee Payable</p>
          <p className="text-[16px] font-black text-blue-700 mt-0.5">Rs {totalPayable.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-text-dark">
            Employees <span className="text-text-muted font-normal">({employees.length})</span>
          </h3>
          <button
            onClick={() => {
              setShowAddEmployee((v) => !v);
              setAddEmployeeError("");
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-[12px] font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showAddEmployee ? "M6 18L18 6M6 6l12 12" : "M12 4.5v15m7.5-7.5h-15"} />
            </svg>
            {showAddEmployee ? "Cancel" : "Add"}
          </button>
        </div>

        {showAddEmployee && (
          <form onSubmit={handleAddEmployee} className="bg-white border border-border-soft rounded-2xl p-4 space-y-3 shadow-sm">
            {addEmployeeError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{addEmployeeError}</p>
            )}
            <input
              required
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((v) => ({ ...v, name: e.target.value }))}
              placeholder="Employee Name *"
              className={inputCls}
            />
            <input
              required
              type="date"
              value={newEmployee.joiningDate}
              onChange={(e) => setNewEmployee((v) => ({ ...v, joiningDate: e.target.value }))}
              className={inputCls}
            />
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-muted">Rs</span>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={newEmployee.salary}
                onChange={(e) => setNewEmployee((v) => ({ ...v, salary: e.target.value }))}
                placeholder="Monthly Salary *"
                className={inputCls + " pl-9"}
              />
            </div>
            <input
              value={newEmployee.phone}
              onChange={(e) => setNewEmployee((v) => ({ ...v, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className={inputCls}
            />
            <input
              value={newEmployee.address}
              onChange={(e) => setNewEmployee((v) => ({ ...v, address: e.target.value }))}
              placeholder="Address (optional)"
              className={inputCls}
            />
            <button type="submit" disabled={addingEmployee} className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors">
              {addingEmployee ? "Saving…" : "Save Employee"}
            </button>
          </form>
        )}

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-soft bg-white text-[13px] text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>

        <div className="space-y-1.5 max-h-[280px] lg:max-h-[620px] overflow-y-auto pr-1">
          {loadingEmployees ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-white rounded-xl border border-border-soft animate-pulse" />
            ))
          ) : filteredEmployees.length === 0 ? (
            <p className="text-[12px] text-text-muted text-center py-8">
              {employeeSearch ? "No employees match" : "No employees yet"}
            </p>
          ) : filteredEmployees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => setSelectedEmployee(employee)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedEmployee?.id === employee.id
                  ? "bg-primary/5 border-primary/30 shadow-sm"
                  : "bg-white border-border-soft hover:bg-bg"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-dark truncate">{employee.name}</p>
                  <p className="text-[11px] text-text-muted">Joined: {fmtDate(employee.joiningDate)}</p>
                  {employee.salary > 0 && <p className="text-[10px] text-blue-600 font-semibold">Salary: Rs {employee.salary.toLocaleString()}</p>}
                </div>
                <span className={`text-[12px] font-bold shrink-0 ${
                  employee.balance > 0 ? "text-blue-700" : employee.balance < 0 ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {employee.balance > 0
                    ? `Rs ${employee.balance.toLocaleString()}`
                    : employee.balance < 0
                    ? `-Rs ${Math.abs(employee.balance).toLocaleString()}`
                    : "Settled"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedEmployee ? (
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-[17px] font-bold text-text-dark">{selectedEmployee.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2">
                  <span className="text-[12px] text-text-muted">Joined: {fmtDate(selectedEmployee.joiningDate)}</span>
                  {selectedEmployee.phone && <span className="text-[12px] text-text-muted">📞 {selectedEmployee.phone}</span>}
                  {selectedEmployee.address && <span className="text-[12px] text-text-muted">📍 {selectedEmployee.address}</span>}
                </div>
                {selectedEmployee.salary > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Monthly Salary</p>
                      <p className="text-[14px] font-black text-blue-700">Rs {selectedEmployee.salary.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">Advances Taken</p>
                      <p className="text-[14px] font-black text-amber-700">Rs {selectedEmployee.balance > 0 ? selectedEmployee.balance.toLocaleString() : "0"}</p>
                    </div>
                    <div className={`rounded-xl px-4 py-2 border ${
                      selectedEmployee.salary - selectedEmployee.balance > 0
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-red-50 border-red-100"
                    }`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Net Salary Remaining</p>
                      <p className={`text-[14px] font-black ${
                        selectedEmployee.salary - selectedEmployee.balance > 0 ? "text-emerald-700" : "text-red-600"
                      }`}>
                        Rs {Math.max(0, selectedEmployee.salary - selectedEmployee.balance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
                <div className={`rounded-2xl px-5 py-3 text-right border ${
                  selectedEmployee.balance > 0
                    ? "bg-blue-50 border-blue-100"
                    : selectedEmployee.balance < 0
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-slate-50 border-slate-100"
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {selectedEmployee.balance > 0 ? "Total Advance Taken" : selectedEmployee.balance < 0 ? "Overpaid" : "No Advance"}
                  </p>
                  <p className={`text-[22px] font-black mt-0.5 ${
                    selectedEmployee.balance > 0
                      ? "text-blue-700"
                      : selectedEmployee.balance < 0
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}>
                    {selectedEmployee.balance === 0 ? "✔" : `Rs ${Math.abs(selectedEmployee.balance).toLocaleString()}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={openEditEmployee}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[12px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Edit Employee
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteEmployee}
                    disabled={deletingEmployee}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-[12px] font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
                  >
                    {deletingEmployee ? "Removing..." : "Remove Employee"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showEditEmployee && (
            <form onSubmit={handleEditEmployee} className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-[13px] font-semibold text-text-dark">Edit Employee Details</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEmployee(false);
                    setEditEmployeeError("");
                  }}
                  className="text-[12px] font-semibold text-text-muted hover:text-text-dark transition-colors"
                >
                  Cancel
                </button>
              </div>
              {editEmployeeError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editEmployeeError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <input
                  required
                  value={editEmployee.name}
                  onChange={(e) => setEditEmployee((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Employee Name *"
                  className={inputCls}
                />
                <input
                  required
                  type="date"
                  value={editEmployee.joiningDate}
                  onChange={(e) => setEditEmployee((v) => ({ ...v, joiningDate: e.target.value }))}
                  className={inputCls}
                />
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-muted">Rs</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editEmployee.salary}
                    onChange={(e) => setEditEmployee((v) => ({ ...v, salary: e.target.value }))}
                    placeholder="Monthly Salary *"
                    className={inputCls + " pl-9"}
                  />
                </div>
                <input
                  value={editEmployee.phone}
                  onChange={(e) => setEditEmployee((v) => ({ ...v, phone: e.target.value }))}
                  placeholder="Phone"
                  className={inputCls}
                />
                <input
                  value={editEmployee.address}
                  onChange={(e) => setEditEmployee((v) => ({ ...v, address: e.target.value }))}
                  placeholder="Address"
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={editingEmployee}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  {editingEmployee ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleAddEntry} className="bg-white rounded-2xl border border-border-soft p-5 shadow-sm space-y-4">
            <h4 className="text-[13px] font-semibold text-text-dark">Add Employee Transaction</h4>
            {addEntryError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{addEntryError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex rounded-xl border border-border-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEntryType("credit")}
                  className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                    entryType === "credit" ? "bg-blue-600 text-white" : "bg-white text-text-muted hover:bg-bg"
                  }`}
                >
                  + Credit
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("debit")}
                  className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${
                    entryType === "debit" ? "bg-emerald-500 text-white" : "bg-white text-text-muted hover:bg-bg"
                  }`}
                >
                  − Debit
                </button>
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                placeholder="Amount (Rs)"
                className={inputCls}
              />
              <input
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder="Note / Description (optional)"
                className={inputCls}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={addingEntry} className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {addingEntry ? "Saving…" : "Add Transaction"}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-border-soft shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft">
              <h4 className="text-[13px] font-semibold text-text-dark">Employee Transaction History</h4>
              <p className="text-[11px] text-text-muted mt-0.5">{entries.length} transaction{entries.length !== 1 ? "s" : ""}</p>
            </div>
            {loadingEntries ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-bg rounded-lg animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13px] text-text-muted">No transactions yet. Add one above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-bg/60">
                      {["Date", "Type", "Amount", "Note"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-bg/40 transition-colors">
                        <td className="px-5 py-3.5 pl-6 text-[12px] text-text-muted whitespace-nowrap">{fmt(entry.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            entry.type === "credit" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {entry.type === "credit" ? "+ Credit" : "− Debit"}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-[13px] font-bold ${
                          entry.type === "credit" ? "text-blue-700" : "text-emerald-600"
                        }`}>
                          Rs {entry.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 pr-6 text-[12px] text-text-dark">
                          {entry.note ?? <span className="text-text-muted italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-24 text-center bg-white rounded-2xl border border-border-soft shadow-sm">
          <svg className="w-14 h-14 text-text-muted/25 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75V19.5a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 016 19.5v-.75m12 0V6.75A2.25 2.25 0 0015.75 4.5h-7.5A2.25 2.25 0 006 6.75v12m12 0H6" />
          </svg>
          <p className="text-[15px] font-semibold text-text-dark">Select an employee</p>
          <p className="text-[12px] text-text-muted mt-1">Click any employee on the left to view and manage their ledger</p>
        </div>
      )}
    </div>
  );
}

// ─── Weekly Schedule View ───────────────────────────────────────────────────
const DAYS_OF_WEEK: api.DayOfWeek[] = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const DAY_COLORS: Record<api.DayOfWeek, { bg: string; border: string; text: string; dot: string }> = {
  Sunday:    { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    dot: "bg-rose-400"    },
  Monday:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-400"    },
  Tuesday:   { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  dot: "bg-violet-400"  },
  Wednesday: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-400"   },
  Thursday:  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
  Friday:    { bg: "bg-cyan-50",    border: "border-cyan-200",    text: "text-cyan-700",    dot: "bg-cyan-400"    },
  Saturday:  { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  dot: "bg-orange-400"  },
};

const EMPTY_SCHEDULE: api.SupplierScheduleCreate = {
  supplierName: "",
  bookingDay: "Sunday",
  supplyDay: "Sunday",
};

/** Returns true if lastBookedAt falls within the current Sun–Sat calendar week. */
function isBookedThisWeek(lastBookedAt?: string): boolean {
  if (!lastBookedAt) return false;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  const booked = new Date(lastBookedAt);
  return booked >= sunday && booked <= saturday;
}

function WeeklyScheduleView() {
  const [schedules, setSchedules] = useState<api.SupplierSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<api.SupplierScheduleCreate>({ ...EMPTY_SCHEDULE });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState<api.SupplierSchedule | null>(null);
  const [editForm, setEditForm] = useState<api.SupplierScheduleCreate>({ ...EMPTY_SCHEDULE });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Password-protected delete state
  const [deleteTarget, setDeleteTarget] = useState<api.SupplierSchedule | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePass, setShowDeletePass] = useState(false);

  // Booking toggle state
  const [togglingBooking, setTogglingBooking] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = api.subscribeToSupplierSchedules((data) => {
      setSchedules(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.supplierName.trim()) { setFormError("Supplier name is required."); return; }
    setSaving(true);
    try {
      await api.addSupplierSchedule(form);
      setForm({ ...EMPTY_SCHEDULE });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: api.SupplierSchedule) {
    setEditTarget(s);
    setEditForm({ supplierName: s.supplierName, bookingDay: s.bookingDay, supplyDay: s.supplyDay });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError("");
    setEditSaving(true);
    try {
      await api.updateSupplierSchedule(editTarget.id, editForm);
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSaving(false);
    }
  }

  function openDelete(s: api.SupplierSchedule) {
    setDeleteTarget(s);
    setDeletePassword("");
    setDeleteError("");
    setShowDeletePass(false);
  }

  async function toggleBooking(s: api.SupplierSchedule) {
    const booked = isBookedThisWeek(s.lastBookedAt);
    setTogglingBooking((prev) => new Set([...prev, s.id]));
    try {
      await api.setBookingStatus(s.id, !booked);
    } finally {
      setTogglingBooking((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await api.reauthenticate(deletePassword);
      await api.deleteSupplierSchedule(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setDeleteError(msg.includes("auth") || msg.includes("password") || msg.includes("wrong") || msg.includes("credential")
        ? "Incorrect password. Please try again."
        : msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }) as api.DayOfWeek;
  const isPastNoon = new Date().getHours() >= 12;
  const [expandedDay, setExpandedDay] = useState<api.DayOfWeek | null>(today);

  const filteredSchedules = supplierSearch
    ? schedules.filter((s) => s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()))
    : schedules;

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all";
  const selectCls = "w-full px-3.5 py-2.5 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[12px] text-text-muted">
          <span className="font-semibold text-text-dark">{schedules.length}</span> supplier{schedules.length !== 1 ? "s" : ""} scheduled
        </p>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-dark shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4.5v15m7.5-7.5h-15"} />
          </svg>
          {showForm ? "Cancel" : "Add Supplier"}
        </button>
      </div>

      {/* Add Supplier Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-border-soft rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="text-[14px] font-semibold text-text-dark">New Supplier Schedule</h3>
          {formError && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <p className="text-[12px] text-red-600">{formError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Supplier / Company Name *</label>
              <input required value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Nestle, Getz, GSK" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Booking Day *</label>
              <select value={form.bookingDay} onChange={(e) => setForm((f) => ({ ...f, bookingDay: e.target.value as api.DayOfWeek }))} className={selectCls}>
                {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-text-dark">Supply Day *</label>
              <select value={form.supplyDay} onChange={(e) => setForm((f) => ({ ...f, supplyDay: e.target.value as api.DayOfWeek }))} className={selectCls}>
                {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center gap-2">
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              {saving ? "Saving…" : "Save Supplier"}
            </button>
          </div>
        </form>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border-soft p-4 space-y-3 animate-pulse">
              <div className="h-5 w-28 bg-bg rounded-full" />
              <div className="h-4 w-full bg-bg rounded-full" />
              <div className="h-4 w-3/4 bg-bg rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* 7-day grid — no delete buttons here, just names */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const c = DAY_COLORS[day];
            const isToday = day === today;
            const isExpanded = day === expandedDay;
            const booking = schedules.filter((s) => s.bookingDay === day);
            const supply  = schedules.filter((s) => s.supplyDay  === day);

            return (
              <div key={day} className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden transition-all ${isExpanded ? "shadow-md" : "shadow-sm"} ${isToday ? "ring-2 ring-offset-1 ring-primary/40" : ""}`}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDay((prev) => {
                      if (prev === day) return day === today ? day : null;
                      return day;
                    })
                  }
                  className={`w-full px-4 py-3 flex items-center justify-between ${isExpanded ? `border-b ${c.border}` : ""} hover:bg-white/30 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <h3 className={`text-[14px] font-bold ${c.text}`}>{day}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary text-white rounded-full">Today</span>}
                    <svg className={`w-4 h-4 ${c.text} transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {isExpanded ? (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Booking Day
                    </p>
                    {booking.length === 0 ? (
                      <p className="text-[11px] text-text-muted/50 italic">No bookings</p>
                    ) : (
                      <div className="space-y-1.5">
                        {booking.map((s) => {
                          const booked = isBookedThisWeek(s.lastBookedAt);
                          const isToggling = togglingBooking.has(s.id);
                          // Lock toggle once booked and it's past 12 PM
                          const locked = booked && isPastNoon;
                          return (
                            <div key={s.id} className="flex items-start gap-2 bg-white/70 rounded-lg px-2.5 py-1.5">
                              <span className="text-[12px] font-semibold text-text-dark break-words leading-5 flex-1">{s.supplierName}</span>

                              {isToday ? (
                                // ── Today's card: interactive toggle ──
                                <button
                                  onClick={() => !locked && toggleBooking(s)}
                                  disabled={isToggling || locked}
                                  title={
                                    locked
                                      ? "Booking locked after 12 PM"
                                      : booked
                                      ? "Unmark booking"
                                      : "Mark as booked"
                                  }
                                  className={`shrink-0 self-start mt-0.5 min-w-[84px] justify-center flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                    locked
                                      ? "cursor-not-allowed opacity-70"
                                      : "disabled:opacity-50"
                                  } ${
                                    booked
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {isToggling ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                  ) : booked ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                      <span>Booked</span>
                                      {locked && (
                                        <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      <span>Pending</span>
                                    </>
                                  )}
                                </button>
                              ) : booked ? (
                                // ── Other days: static Booked badge only ──
                                <span className="shrink-0 self-start mt-0.5 min-w-[84px] justify-center flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                  <span>Booked</span>
                                </span>
                              ) : null /* no badge on other days if not yet booked */}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className={`h-px ${c.border} border-t`} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      Supply Day
                    </p>
                    {supply.length === 0 ? (
                      <p className="text-[11px] text-text-muted/50 italic">No supplies</p>
                    ) : (
                      <div className="space-y-1.5">
                        {supply.map((s) => (
                          <div key={s.id} className="flex items-start gap-2 bg-white/70 rounded-lg px-2.5 py-1.5">
                            <svg className="w-3 h-3 text-emerald-500 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            <span className="text-[12px] font-semibold text-text-dark break-words leading-5">{s.supplierName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                ) : (
                  <div className="px-4 pb-3">
                    <div className="bg-white/60 rounded-xl px-3 py-2">
                      <p className="text-[11px] text-text-muted">
                        <span className="font-semibold text-text-dark">{booking.length}</span> booking · <span className="font-semibold text-text-dark">{supply.length}</span> supply
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Supplier list table with search */}
      {!loading && schedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-border-soft shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-soft flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-text-dark">All Suppliers</h3>
              <p className="text-[12px] text-text-muted mt-0.5">
                {filteredSchedules.length} of {schedules.length} supplier schedule{schedules.length !== 1 ? "s" : ""}
              </p>
            </div>
            {/* Search bar */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Search supplier…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg/60 sticky top-0 z-10">
                  {["Supplier / Company", "Booking Day", "Supply Day", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[13px] text-text-muted">No suppliers match your search</td>
                  </tr>
                ) : filteredSchedules.map((s) => {
                  const bc = DAY_COLORS[s.bookingDay];
                  const sc = DAY_COLORS[s.supplyDay];
                  return (
                    <tr key={s.id} className="hover:bg-bg/40 transition-colors">
                      <td className="px-5 py-3.5 pl-6">
                        <p className="text-[13px] font-semibold text-text-dark">{s.supplierName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bc.bg} ${bc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${bc.dot}`} />{s.bookingDay}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{s.supplyDay}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-soft text-[12px] font-medium text-text-soft hover:bg-bg transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(s)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-[12px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-text-dark">Edit Supplier</h2>
              <p className="text-[12px] text-text-muted mt-0.5">Update schedule for <span className="font-semibold">{editTarget.supplierName}</span></p>
            </div>
            {editError && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-[12px] text-red-600">{editError}</p>
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-text-dark">Supplier / Company Name *</label>
                <input required value={editForm.supplierName} onChange={(e) => setEditForm((f) => ({ ...f, supplierName: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-text-dark">Booking Day *</label>
                  <select value={editForm.bookingDay} onChange={(e) => setEditForm((f) => ({ ...f, bookingDay: e.target.value as api.DayOfWeek }))} className={selectCls}>
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-text-dark">Supply Day *</label>
                  <select value={editForm.supplyDay} onChange={(e) => setEditForm((f) => ({ ...f, supplyDay: e.target.value as api.DayOfWeek }))} className={selectCls}>
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {editSaving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Password-protected Delete Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-text-dark">Remove Supplier?</h3>
                <p className="text-[12px] text-text-muted mt-0.5">Enter your admin password to confirm.</p>
              </div>
            </div>
            <div className="bg-bg rounded-xl px-4 py-3">
              <p className="text-[13px] font-semibold text-text-dark">{deleteTarget.supplierName}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Booking: {deleteTarget.bookingDay} · Supply: {deleteTarget.supplyDay}</p>
            </div>
            {deleteError && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-[12px] text-red-600">{deleteError}</p>
              </div>
            )}
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-text-dark">Admin Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showDeletePass ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    className={inputCls + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowDeletePass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dark">
                    {showDeletePass
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-border-soft text-[13px] font-medium text-text-soft hover:bg-bg transition-colors">Cancel</button>
                <button type="submit" disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {deleteLoading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                  {deleteLoading ? "Verifying…" : "Confirm Remove"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<"requests" | "orderSummary" | "weeklySchedule" | "customers" | "employees">("requests");

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
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-center gap-1 bg-bg rounded-xl p-1 w-max min-w-full sm:min-w-0 sm:w-fit">
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
        <button
          onClick={() => setActiveTab("weeklySchedule")}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "weeklySchedule"
              ? "bg-white text-text-dark shadow-sm"
              : "text-text-muted hover:text-text-dark"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
            Weekly Schedule
          </span>
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "customers"
              ? "bg-white text-text-dark shadow-sm"
              : "text-text-muted hover:text-text-dark"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            Customer Ledger
          </span>
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "employees"
              ? "bg-white text-text-dark shadow-sm"
              : "text-text-muted hover:text-text-dark"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Employee Ledger
          </span>
        </button>
        </div>
      </div>

      {/* ── Order Summary (grouped by Supplier) ── */}
      {activeTab === "orderSummary" && (
        <OrderSummaryView requests={requests} loading={loading} />
      )}

      {/* ── Weekly Schedule ── */}
      {activeTab === "weeklySchedule" && (
        <WeeklyScheduleView />
      )}

      {/* ── Customer Ledger ── */}
      {activeTab === "customers" && (
        <CustomerLedgerView />
      )}

      {/* ── Employee Ledger ── */}
      {activeTab === "employees" && (
        <EmployeeLedgerView />
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
                {["Customer", "Medicine", "Qty", "Supplier", "Company", "Expected Date", "Status", "Created", "Actions"].map((h) => (
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
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4 first:pl-6 last:pr-6">
                        <div className="h-4 bg-bg rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
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
                      {req.expectedDate ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                          {fmtDate(req.expectedDate)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-text-muted/50">—</span>
                      )}
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
