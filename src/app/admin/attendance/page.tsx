"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as api from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function firstWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function isFutureDay(year: number, month: number, day: number) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return new Date(year, month - 1, day) > today;
}
function isToday(year: number, month: number, day: number) {
  const t = new Date();
  return t.getFullYear() === year && t.getMonth() + 1 === month && t.getDate() === day;
}

// ─── PIN Lock Screen ──────────────────────────────────────────────────────────
function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits]   = useState<string[]>(Array(6).fill(""));
  const [error, setError]     = useState("");
  const [shake, setShake]     = useState(false);
  const [checking, setChecking] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const filled = digits.join("");

  const verify = useCallback(async (pin: string) => {
    setChecking(true);
    setError("");
    try {
      const stored = await api.getAttendancePin();
      if (pin === stored) {
        onUnlock();
      } else {
        setError("Incorrect PIN. Try again.");
        setShake(true);
        setDigits(Array(6).fill(""));
        setTimeout(() => { setShake(false); inputs.current[0]?.focus(); }, 600);
      }
    } catch {
      setError("Could not verify PIN. Check your connection.");
      setDigits(Array(6).fill(""));
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setChecking(false);
    }
  }, [onUnlock]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (filled.length === 6 && !checking) {
      verify(filled);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = "";
        setDigits(next);
      } else if (idx > 0) {
        next[idx - 1] = "";
        setDigits(next);
        inputs.current[idx - 1]?.focus();
      }
      setError("");
    }
  }

  function handleChange(idx: number, value: string) {
    const ch = value.replace(/\D/g, "").slice(-1);
    if (!ch) return;
    const next = [...digits];
    next[idx] = ch;
    setDigits(next);
    setError("");
    if (idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className={`bg-white rounded-2xl border border-border-soft shadow-lg p-8 w-full max-w-sm text-center ${shake ? "animate-shake" : ""}`}>
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-[18px] font-bold text-text-dark">Attendance PIN</h2>
        <p className="text-[13px] text-text-muted mt-1 mb-6">Enter your 6-digit PIN to continue</p>

        {/* Digit boxes */}
        <div className="flex items-center justify-center gap-2 mb-5" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              onClick={() => inputs.current[i]?.select()}
              disabled={checking}
              className={`
                w-11 h-13 text-center text-[20px] font-bold rounded-xl border-2 outline-none
                transition-all duration-150 caret-transparent
                ${d ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg text-text-dark"}
                ${error ? "border-red-300" : ""}
                focus:border-primary focus:bg-primary/5
                disabled:opacity-50
              `}
              style={{ height: "3.25rem" }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-500 font-medium mb-3">{error}</p>
        )}

        {/* Loading indicator */}
        {checking && (
          <div className="flex justify-center">
            <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        )}

       
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

// ─── Change PIN Modal ─────────────────────────────────────────────────────────
function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]         = useState<"current" | "new" | "confirm">("current");
  const [current, setCurrent]   = useState("");
  const [newPin, setNewPin]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);

  async function handleCurrentNext() {
    setError("");
    if (current.length !== 6) { setError("Enter all 6 digits."); return; }
    setSaving(true);
    try {
      const stored = await api.getAttendancePin();
      if (current !== stored) { setError("Current PIN is incorrect."); return; }
      setStep("new");
    } catch { setError("Could not verify. Try again."); }
    finally { setSaving(false); }
  }

  function handleNewNext() {
    setError("");
    if (newPin.length !== 6) { setError("Enter all 6 digits."); return; }
    setStep("confirm");
  }

  async function handleSave() {
    setError("");
    if (confirm !== newPin) { setError("PINs do not match."); return; }
    setSaving(true);
    try {
      await api.setAttendancePin(newPin);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-border-soft shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-text-dark">Change Attendance PIN</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text-dark">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <p className="text-[14px] font-semibold text-text-dark">PIN Changed Successfully</p>
          </div>
        ) : (
          <div className="space-y-4">
            {step === "current" && (
              <>
                <label className="block text-[12px] font-medium text-text-muted mb-1">Current PIN</label>
                <PinInput value={current} onChange={setCurrent} />
                {error && <p className="text-[12px] text-red-500">{error}</p>}
                <button onClick={handleCurrentNext} disabled={saving || current.length !== 6}
                  className="w-full py-2.5 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? "Verifying…" : "Next"}
                </button>
              </>
            )}
            {step === "new" && (
              <>
                <label className="block text-[12px] font-medium text-text-muted mb-1">New PIN</label>
                <PinInput value={newPin} onChange={setNewPin} />
                {error && <p className="text-[12px] text-red-500">{error}</p>}
                <button onClick={handleNewNext} disabled={newPin.length !== 6}
                  className="w-full py-2.5 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  Next
                </button>
              </>
            )}
            {step === "confirm" && (
              <>
                <label className="block text-[12px] font-medium text-text-muted mb-1">Confirm New PIN</label>
                <PinInput value={confirm} onChange={setConfirm} />
                {error && <p className="text-[12px] text-red-500">{error}</p>}
                <button onClick={handleSave} disabled={saving || confirm.length !== 6}
                  className="w-full py-2.5 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save New PIN"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Small reusable PIN input row used inside ChangePinModal
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  function handleChange(idx: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    if (!ch) return;
    const next = [...digits];
    next[idx] = ch;
    onChange(next.join("").trimEnd());
    if (idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = " ";
      } else if (idx > 0) {
        next[idx - 1] = " ";
        inputs.current[idx - 1]?.focus();
      }
      onChange(next.join("").trimEnd());
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array(6).fill(null).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() ?? ""}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-10 h-11 text-center text-[18px] font-bold rounded-xl border-2 border-border-soft bg-bg focus:border-primary focus:bg-primary/5 outline-none transition-all caret-transparent"
        />
      ))}
    </div>
  );
}

// ─── Attendance Page ──────────────────────────────────────────────────────────
export default function AttendancePage() {
  const now = new Date();
  const [unlocked, setUnlocked]   = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [employees, setEmployees]     = useState<api.Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [empSearch, setEmpSearch]     = useState("");
  const [selected, setSelected]       = useState<api.Employee | null>(null);

  const [allAbsent, setAllAbsent] = useState<Set<string>>(new Set());
  const [toggling, setToggling]   = useState<string | null>(null);
  const [toastMsg, setToastMsg]   = useState("");

  // ── Employees ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = api.subscribeToEmployees((data) => {
      setEmployees(data);
      setLoadingEmps(false);
    });
    return () => unsub();
  }, []);

  // ── Attendance for selected employee ───────────────────────────────────────
  useEffect(() => {
    if (!selected) { setAllAbsent(new Set()); return; }
    const unsub = api.subscribeToAttendanceForEmployee(selected.id, (records) => {
      setAllAbsent(new Set(records.map((r) => r.date)));
    });
    return () => unsub();
  }, [selected?.id]);

  // ── Month absent set ───────────────────────────────────────────────────────
  const monthAbsent = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2,"0")}`;
    return new Set([...allAbsent].filter((d) => d.startsWith(prefix)));
  }, [allAbsent, year, month]);

  // ── Salary summary ─────────────────────────────────────────────────────────
  const totalDays   = daysInMonth(year, month);
  const absentCount = monthAbsent.size;
  const presentCount = totalDays - absentCount;

  const perDaySalary = useMemo(() => {
    if (!selected) return 0;
    return selected.salaryType === "weekly"
      ? selected.salary / 7
      : selected.salary / totalDays;
  }, [selected, totalDays]);

  const deduction  = absentCount * perDaySalary;
  const advance    = selected ? Math.max(0, selected.balance) : 0;
  const netPayable = selected ? Math.max(0, selected.salary - deduction - advance) : 0;

  // ── Toggle day ─────────────────────────────────────────────────────────────
  async function toggleDay(day: number) {
    if (!selected) return;
    const dateStr = toDateStr(year, month, day);
    if (isFutureDay(year, month, day)) return;
    setToggling(dateStr);
    try {
      if (allAbsent.has(dateStr)) {
        await api.markPresent(selected.id, dateStr);
        flash("Marked Present");
      } else {
        await api.markAbsent(selected.id, dateStr);
        flash("Marked Absent");
      }
    } catch {
      flash("Error – please retry");
    } finally {
      setToggling(null);
    }
  }

  function flash(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const startOffset = firstWeekday(year, month);
  const totalCells  = startOffset + totalDays;
  const rows        = Math.ceil(totalCells / 7);

  // ── PIN gate ───────────────────────────────────────────────────────────────
  if (!unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-bg">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-dark tracking-tight">Attendance</h1>
          <p className="text-[13px] text-text-muted mt-1">
            Mark absent days — all other days count as present
          </p>
        </div>
        <button
          onClick={() => setShowChangePin(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-soft text-[12px] font-medium text-text-muted hover:text-text-dark hover:bg-bg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Change PIN
        </button>
      </div>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl bg-text-dark text-white text-[13px] font-medium shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* ── Change PIN Modal ── */}
      {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Employee List ── */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-border-soft shadow-sm p-4 space-y-3 h-fit">
          <h2 className="text-[13px] font-semibold text-text-dark px-1">Employees</h2>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text" value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Search employee…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-soft bg-bg text-[13px] text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>

          {loadingEmps ? (
            <div className="flex justify-center py-8">
              <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-center text-[12px] text-text-muted py-6">No employees found</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                    selected?.id === emp.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-bg border border-transparent"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-primary">{emp.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text-dark truncate">{emp.name}</p>
                  </div>
                  {selected?.id === emp.id && (
                    <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Main Panel ── */}
        <div className="flex-1 space-y-5">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-border-soft shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-text-dark">Select an Employee</p>
              <p className="text-[13px] text-text-muted mt-1">Choose an employee from the list to manage their attendance</p>
            </div>
          ) : (
            <>
              {/* Month Navigator */}
              <div className="bg-white rounded-2xl border border-border-soft shadow-sm px-6 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-[16px] font-bold text-text-dark">{selected.name}</h2>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      {selected.salaryType === "weekly"
                        ? `Rs ${selected.salary.toLocaleString()} / week`
                        : `Rs ${selected.salary.toLocaleString()} / month`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-soft hover:bg-bg transition-colors">
                      <svg className="w-4 h-4 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="text-[14px] font-semibold text-text-dark min-w-[140px] text-center">
                      {MONTH_NAMES[month - 1]} {year}
                    </span>
                    <button onClick={nextMonth}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-soft hover:bg-bg transition-colors">
                      <svg className="w-4 h-4 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-white rounded-2xl border border-border-soft shadow-sm p-5">
                <div className="grid grid-cols-7 mb-2">
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="text-center text-[11px] font-semibold text-text-muted py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: rows * 7 }).map((_, idx) => {
                    const day = idx - startOffset + 1;
                    if (day < 1 || day > totalDays) return <div key={idx} />;
                    const dateStr = toDateStr(year, month, day);
                    const absent  = allAbsent.has(dateStr);
                    const future  = isFutureDay(year, month, day);
                    const today   = isToday(year, month, day);
                    const loading = toggling === dateStr;
                    return (
                      <button
                        key={idx}
                        onClick={() => !future && !loading && toggleDay(day)}
                        disabled={future || loading}
                        title={absent ? "Absent — click to mark Present" : future ? "Future date" : "Present — click to mark Absent"}
                        className={`
                          relative aspect-square rounded-xl flex flex-col items-center justify-center
                          text-[13px] font-semibold transition-all duration-150 select-none
                          ${future
                            ? "text-text-muted/30 cursor-default"
                            : absent
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"}
                          ${today ? "ring-2 ring-primary ring-offset-1" : ""}
                          ${loading ? "opacity-50 pointer-events-none" : ""}
                        `}
                      >
                        {loading ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <>
                            <span>{day}</span>
                            {!future && (
                              <span className="text-[9px] font-bold mt-0.5 leading-none opacity-70">
                                {absent ? "ABS" : "PRE"}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-soft">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
                    <span className="text-[11px] text-text-muted">Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
                    <span className="text-[11px] text-text-muted">Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-white border-2 border-primary" />
                    <span className="text-[11px] text-text-muted">Today</span>
                  </div>
                  <span className="text-[11px] text-text-muted ml-auto">Click a day to toggle</span>
                </div>
              </div>

              {/* Salary Summary */}
              <div className="bg-white rounded-2xl border border-border-soft shadow-sm p-5">
                <h3 className="text-[13px] font-semibold text-text-dark mb-4">
                  Salary Summary — {MONTH_NAMES[month - 1]} {year}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <SummaryCard label="Total Days"        value={String(totalDays)}    color="slate"   />
                  <SummaryCard label="Present"           value={String(presentCount)} color="emerald" />
                  <SummaryCard label="Absent"            value={String(absentCount)}  color="red"     />
                  <SummaryCard label="Per-Day Salary"
                    value={`Rs ${perDaySalary.toLocaleString("en-PK",{maximumFractionDigits:0})}`} color="blue" />
                  <SummaryCard label="Absence Deduction"
                    value={`Rs ${deduction.toLocaleString("en-PK",{maximumFractionDigits:0})}`}   color="orange" />
                  <SummaryCard label="Advance Taken"
                    value={`Rs ${advance.toLocaleString("en-PK",{maximumFractionDigits:0})}`}     color="purple" />
                </div>
                <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-primary/5 border border-primary/15">
                  <div>
                    <p className="text-[12px] text-text-muted">Net Payable Salary</p>
                    <p className="text-[11px] text-text-muted/70 mt-0.5">Gross − Absence Deduction − Advance</p>
                  </div>
                  <span className="text-[22px] font-bold text-primary">
                    Rs {netPayable.toLocaleString("en-PK",{maximumFractionDigits:0})}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
type CardColor = "slate"|"emerald"|"red"|"blue"|"orange"|"purple";
const COLOR_MAP: Record<CardColor,{bg:string;text:string;label:string}> = {
  slate:   {bg:"bg-slate-50",   text:"text-slate-700",   label:"text-slate-500"},
  emerald: {bg:"bg-emerald-50", text:"text-emerald-700", label:"text-emerald-500"},
  red:     {bg:"bg-red-50",     text:"text-red-700",     label:"text-red-500"},
  blue:    {bg:"bg-blue-50",    text:"text-blue-700",    label:"text-blue-500"},
  orange:  {bg:"bg-orange-50",  text:"text-orange-700",  label:"text-orange-500"},
  purple:  {bg:"bg-purple-50",  text:"text-purple-700",  label:"text-purple-500"},
};
function SummaryCard({label,value,color}:{label:string;value:string;color:CardColor}) {
  const c = COLOR_MAP[color];
  return (
    <div className={`${c.bg} rounded-xl px-4 py-3`}>
      <p className={`text-[11px] font-medium ${c.label}`}>{label}</p>
      <p className={`text-[15px] font-bold ${c.text} mt-1`}>{value}</p>
    </div>
  );
}
