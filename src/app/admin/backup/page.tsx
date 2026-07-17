"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import * as api from "@/lib/api";
import type { BackupData } from "@/lib/api";

const SHEETS: Array<{ label: string; pick: (data: BackupData) => object[] }> = [
  { label: "Customers", pick: (d) => d.customers },
  { label: "Customer Ledger", pick: (d) => d.ledgerEntries },
  { label: "Employees", pick: (d) => d.employees },
  { label: "Employee Ledger", pick: (d) => d.employeeLedgerEntries },
  { label: "Suppliers", pick: (d) => d.suppliers },
  { label: "Supplier Ledger", pick: (d) => d.supplierLedgerEntries },
  { label: "Attendance", pick: (d) => d.attendance },
];

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Format = "json" | "xlsx";

export default function BackupPage() {
  const [downloadingFormat, setDownloadingFormat] = useState<Format | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  function showToast(message: string, error = false) {
    setToast({ message, error });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDownload(format: Format) {
    setDownloadingFormat(format);
    try {
      const data = await api.getFullBackupData();
      const stamp = dateStamp();

      if (format === "json") {
        triggerDownload(
          new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
          `safdarsons-backup-${stamp}.json`
        );
      } else {
        const wb = XLSX.utils.book_new();
        for (const sheet of SHEETS) {
          const rows = sheet.pick(data);
          const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
          XLSX.utils.book_append_sheet(wb, ws, sheet.label.slice(0, 31));
        }
        XLSX.writeFile(wb, `safdarsons-backup-${stamp}.xlsx`);
      }

      showToast(`${format === "json" ? "JSON" : "Excel"} backup downloaded successfully.`);
    } catch {
      showToast("Failed to generate backup. Check your connection and try again.", true);
    } finally {
      setDownloadingFormat(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-bg">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-text-dark tracking-tight">Backup</h1>
        <p className="text-[13px] text-text-muted mt-1">
          Download a full copy of your business data for safekeeping
        </p>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white text-[13px] font-medium shadow-xl ${
            toast.error ? "bg-red-500" : "bg-text-dark"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Card ── */}
      <div className="bg-white rounded-2xl border border-border-soft shadow-sm p-6 max-w-xl space-y-5">
        <div>
          <h2 className="text-[15px] font-bold text-text-dark">What&apos;s included</h2>
          <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted">
            <li>Customers &amp; their credit ledger entries</li>
            <li>Employees &amp; their ledger entries</li>
            <li>Suppliers &amp; their ledger entries</li>
            <li>Attendance records</li>
          </ul>
        </div>

        <div className="pt-1 flex flex-wrap gap-3">
          <button
            onClick={() => handleDownload("json")}
            disabled={downloadingFormat !== null}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {downloadingFormat === "json" ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Preparing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download JSON Backup
              </>
            )}
          </button>

          <button
            onClick={() => handleDownload("xlsx")}
            disabled={downloadingFormat !== null}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border-soft text-text-dark text-[13px] font-semibold hover:bg-bg disabled:opacity-60 transition-colors"
          >
            {downloadingFormat === "xlsx" ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Preparing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Excel Backup
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-text-muted">
          JSON keeps the exact data structure for restoring later. Excel is easier to open and review.
        </p>
      </div>
    </div>
  );
}
