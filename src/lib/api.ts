import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── Firestore collection name ────────────────────────────────────────────────
const COLLECTION = "medicineRequests";

// ─── Token Helpers (kept for API-surface compatibility) ───────────────────────
/** Returns a truthy value when a Firebase user is signed in. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // Firebase persists auth state; currentUser is populated after initialisation.
  // Use onAuthStateChanged in components for reliable async detection.
  return auth.currentUser ? "firebase-session" : null;
}

/** No-op – Firebase manages its own session tokens. */
export function setToken(_token: string): void {
  // intentionally empty
}

/** Signs the current user out of Firebase. */
export function clearAuth(): void {
  signOut(auth).catch(() => {});
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  uid: string;
  email: string;
  name?: string;
}

export interface AdminUser {
  uid: string;
  email?: string;
  name?: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  return {
    token,
    uid: cred.user.uid,
    email: cred.user.email ?? email,
    name: cred.user.displayName ?? undefined,
  };
}

/** Resolves with the current Firebase user or rejects if not authenticated. */
export async function getMe(): Promise<AdminUser> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        resolve({
          uid: user.uid,
          email: user.email ?? undefined,
          name: user.displayName ?? undefined,
        });
      } else {
        reject(new Error("Not authenticated"));
      }
    });
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total: number;
  pending: number;
  arrived: number;
  notified: number;
  collected: number;
  cancelled: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const snap = await getDocs(collection(db, COLLECTION));
  const stats: DashboardStats = {
    total: 0,
    pending: 0,
    arrived: 0,
    notified: 0,
    collected: 0,
    cancelled: 0,
  };
  snap.forEach((d) => {
    const status = d.data().status as RequestStatus;
    stats.total++;
    if (status in stats) (stats as unknown as Record<string, number>)[status]++;
  });
  return stats;
}

// ─── Requests ────────────────────────────────────────────────────────────────
export type RequestStatus =
  | "pending"
  | "arrived"
  | "notified"
  | "collected"
  | "cancelled";

export interface MedicineRequest {
  id: string;
  customerName: string;
  phone: string;
  medicineName: string;
  quantity: number;
  supplierName: string;
  companyName: string;
  notes?: string;
  expectedDate?: string;
  status: RequestStatus;
  createdAt?: string;
  updatedAt?: string;
  arrivedAt?: string;
  notifiedAt?: string;
  collectedAt?: string;
  createdBy: string;
}

export interface MedicineRequestCreate {
  customerName: string;
  phone: string;
  medicineName: string;
  quantity: number;
  supplierName: string;
  companyName: string;
  notes?: string;
  expectedDate?: string;
}

export interface RequestListResponse {
  requests: MedicineRequest[];
  total: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
function tsToString(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === "string") return val;
  return String(val);
}

function docToRequest(
  id: string,
  data: Record<string, unknown>
): MedicineRequest {
  return {
    id,
    customerName: (data.customerName as string) ?? "",
    phone:        (data.phone as string) ?? "",
    medicineName: (data.medicineName as string) ?? "",
    quantity:     (data.quantity as number) ?? 1,
    supplierName: (data.supplierName as string) ?? "",
    companyName:  (data.companyName as string) ?? "",
    notes:        data.notes as string | undefined,
    expectedDate: (data.expectedDate as string) ?? undefined,
    status:       (data.status as RequestStatus) ?? "pending",
    createdAt:    tsToString(data.createdAt),
    updatedAt:    tsToString(data.updatedAt),
    arrivedAt:    tsToString(data.arrivedAt),
    notifiedAt:   tsToString(data.notifiedAt),
    collectedAt:  tsToString(data.collectedAt),
    createdBy:    (data.createdBy as string) ?? "",
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function getRequests(
  search?: string,
  status?: string
): Promise<RequestListResponse> {
  // Build Firestore query (status filter only; text search done client-side)
  const constraints: QueryConstraint[] = [];
  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);

  let requests = snap.docs.map((d) =>
    docToRequest(d.id, d.data() as Record<string, unknown>)
  );

  // Sort newest-first client-side (avoids composite index requirement)
  requests.sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  // Client-side full-text search
  if (search) {
    const s = search.toLowerCase();
    requests = requests.filter(
      (r) =>
        r.customerName.toLowerCase().includes(s) ||
        r.medicineName.toLowerCase().includes(s) ||
        r.supplierName.toLowerCase().includes(s) ||
        r.phone.includes(s)
    );
  }

  return { requests, total: requests.length };
}

export async function getRequest(id: string): Promise<MedicineRequest> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) throw new Error("Request not found");
  return docToRequest(snap.id, snap.data() as Record<string, unknown>);
}

export async function createRequest(
  data: MedicineRequestCreate
): Promise<MedicineRequest> {
  const user = auth.currentUser;
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: "pending",
    createdBy:  user?.uid ?? "admin",
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
  return getRequest(ref.id);
}

export async function updateRequest(
  id: string,
  data: Partial<MedicineRequestCreate & { status: RequestStatus }>
): Promise<MedicineRequest> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return getRequest(id);
}

export async function deleteRequest(id: string): Promise<{ message: string }> {
  await deleteDoc(doc(db, COLLECTION, id));
  return { message: "Deleted successfully" };
}

export async function markArrived(id: string): Promise<MedicineRequest> {
  await updateDoc(doc(db, COLLECTION, id), {
    status:    "arrived",
    arrivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return getRequest(id);
}

export async function markCollected(id: string): Promise<MedicineRequest> {
  await updateDoc(doc(db, COLLECTION, id), {
    status:      "collected",
    collectedAt: serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
  return getRequest(id);
}

export interface NotifyResponse {
  message: string;
  whatsappUrl: string;
  status: string;
}

/**
 * Marks the request as "notified" in Firestore and returns a pre-filled
 * WhatsApp URL so the admin can send a message to the customer directly.
 */
export async function notifyCustomer(id: string): Promise<NotifyResponse> {
  const req = await getRequest(id);

  await updateDoc(doc(db, COLLECTION, id), {
    status:     "notified",
    notifiedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });

  const text = encodeURIComponent(
    `Assalamu Alaikum ${req.customerName},\n\n` +
    `Your medicine *${req.medicineName}* ` +
    `has arrived at *Safdar & Sons Pharma + Veterinary Store*.\n\n` +
    `Please visit us at your earliest convenience.\n\n` +
    `Near Ravi Town, NawanKot Road, Khanpur\n` +
    `Open: 9:00 AM – 11:00 PM\n\n` +
    `Thank you for trusting us!`
  );

  const phone = req.phone.replace(/\D/g, ""); // strip non-digits
  const whatsappUrl = `https://wa.me/${phone}?text=${text}`;

  return {
    message:     "Customer notified – open WhatsApp to send the message.",
    whatsappUrl,
    status:      "notified",
  };
}

// ─── Real-time listener ───────────────────────────────────────────────────────
/**
 * Subscribes to real-time updates on the medicineRequests collection.
 * Calls `onChange` with the full list whenever a document is added, modified, or removed.
 * Returns an unsubscribe function.
 */
export function subscribeToRequests(
  onChange: (requests: MedicineRequest[]) => void
): () => void {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => docToRequest(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    onChange(requests);
  });
}

// ─── Supplier Schedule ────────────────────────────────────────────────────────
export type DayOfWeek =
  | "Sunday" | "Monday" | "Tuesday" | "Wednesday"
  | "Thursday" | "Friday" | "Saturday";

export interface SupplierSchedule {
  id: string;
  supplierName: string;
  bookingDay: DayOfWeek;
  supplyDay: DayOfWeek;
  createdAt?: string;
  lastBookedAt?: string; // ISO date string (YYYY-MM-DD) of last booking confirmation
}

export interface SupplierScheduleCreate {
  supplierName: string;
  bookingDay: DayOfWeek;
  supplyDay: DayOfWeek;
}

const SCHEDULE_COLLECTION = "supplierSchedules";

function docToSchedule(id: string, data: Record<string, unknown>): SupplierSchedule {
  return {
    id,
    supplierName:  (data.supplierName as string) ?? "",
    bookingDay:    (data.bookingDay as DayOfWeek) ?? "Sunday",
    supplyDay:     (data.supplyDay as DayOfWeek) ?? "Sunday",
    createdAt:     tsToString(data.createdAt),
    lastBookedAt:  (data.lastBookedAt as string) ?? undefined,
  };
}

export async function getSupplierSchedules(): Promise<SupplierSchedule[]> {
  const snap = await getDocs(collection(db, SCHEDULE_COLLECTION));
  return snap.docs
    .map((d) => docToSchedule(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
}

export async function addSupplierSchedule(
  data: SupplierScheduleCreate
): Promise<SupplierSchedule> {
  const ref = await addDoc(collection(db, SCHEDULE_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, SCHEDULE_COLLECTION, ref.id));
  return docToSchedule(ref.id, snap.data() as Record<string, unknown>);
}

export async function updateSupplierSchedule(
  id: string,
  data: Partial<SupplierScheduleCreate>
): Promise<void> {
  await updateDoc(doc(db, SCHEDULE_COLLECTION, id), { ...data });
}

/**
 * Marks a supplier booking as done (sets lastBookedAt to today) or clears it.
 */
export async function setBookingStatus(id: string, booked: boolean): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  await updateDoc(doc(db, SCHEDULE_COLLECTION, id), {
    lastBookedAt: booked ? today : null,
  });
}

/**
 * Re-authenticates the currently signed-in user with their password.
 * Throws if the password is wrong.
 */
export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No signed-in user.");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function deleteSupplierSchedule(id: string): Promise<void> {
  await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
}

export function subscribeToSupplierSchedules(
  onChange: (schedules: SupplierSchedule[]) => void
): () => void {
  return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snap) => {
    const schedules = snap.docs
      .map((d) => docToSchedule(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    onChange(schedules);
  });
}

// ─── Customer Ledger ──────────────────────────────────────────────────────────
export type LedgerEntryType = "credit" | "debit";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  /** Positive = customer owes us. Negative = we owe customer. */
  balance: number;
  createdAt?: string;
}

export interface CustomerCreate {
  name: string;
  phone?: string;
  address?: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  type: LedgerEntryType;
  amount: number;
  note?: string;
  createdAt?: string;
  lastEditedAmount?: number;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface LedgerEntryCreate {
  customerId: string;
  type: LedgerEntryType;
  amount: number;
  note?: string;
}

const CUSTOMERS_COLLECTION = "customers";
const LEDGER_COLLECTION    = "ledgerEntries";

function docToCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name:      (data.name    as string) ?? "",
    phone:     (data.phone   as string) ?? undefined,
    address:   (data.address as string) ?? undefined,
    balance:   (data.balance as number) ?? 0,
    createdAt: tsToString(data.createdAt),
  };
}

function docToLedgerEntry(id: string, data: Record<string, unknown>): LedgerEntry {
  return {
    id,
    customerId: (data.customerId as string)         ?? "",
    type:       (data.type       as LedgerEntryType) ?? "credit",
    amount:     (data.amount     as number)          ?? 0,
    note:       (data.note       as string)          ?? undefined,
    createdAt:  tsToString(data.createdAt),
    lastEditedAmount: (data.lastEditedAmount as number) ?? undefined,
    lastEditedAt: tsToString(data.lastEditedAt),
    lastEditedBy: (data.lastEditedBy as string) ?? undefined,
  };
}

export async function addCustomer(data: CustomerCreate): Promise<Customer> {
  const ref = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
    ...data,
    balance: 0,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, CUSTOMERS_COLLECTION, ref.id));
  return docToCustomer(ref.id, snap.data() as Record<string, unknown>);
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerCreate>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined) payload.phone = data.phone || null;
  if (data.address !== undefined) payload.address = data.address || null;
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), payload);
}

export async function deleteCustomer(id: string): Promise<void> {
  const ledgerSnap = await getDocs(
    query(collection(db, LEDGER_COLLECTION), where("customerId", "==", id))
  );

  await Promise.all(ledgerSnap.docs.map((entry) => deleteDoc(entry.ref)));
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
}

export function subscribeToCustomers(
  onChange: (customers: Customer[]) => void
): () => void {
  return onSnapshot(collection(db, CUSTOMERS_COLLECTION), (snap) => {
    const customers = snap.docs
      .map((d) => docToCustomer(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name));
    onChange(customers);
  });
}

/**
 * Atomically adds a ledger entry and updates the customer's balance.
 * Credit increases balance (customer owes more); Debit decreases it.
 */
export async function addLedgerEntry(data: LedgerEntryCreate): Promise<void> {
  await runTransaction(db, async (tx) => {
    const customerRef  = doc(db, CUSTOMERS_COLLECTION, data.customerId);
    const customerSnap = await tx.get(customerRef);
    const current      = (customerSnap.data()?.balance as number) ?? 0;
    const delta        = data.type === "credit" ? data.amount : -data.amount;
    tx.update(customerRef, { balance: current + delta });
    const ledgerRef = doc(collection(db, LEDGER_COLLECTION));
    const payload: Record<string, unknown> = {
      customerId: data.customerId,
      type:       data.type,
      amount:     data.amount,
      createdAt:  serverTimestamp(),
    };
    if (data.note) payload.note = data.note;
    tx.set(ledgerRef, payload);
  });
}

/**
 * Atomically updates a ledger entry and adjusts the customer's balance by the
 * delta between the old entry and the new entry.
 */
export async function updateLedgerEntry(
  id: string,
  data: LedgerEntryCreate
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ledgerRef    = doc(db, LEDGER_COLLECTION, id);
    const ledgerSnap   = await tx.get(ledgerRef);
    if (!ledgerSnap.exists()) throw new Error("Transaction not found.");

    const existing = docToLedgerEntry(id, ledgerSnap.data() as Record<string, unknown>);
    if (existing.customerId !== data.customerId) {
      throw new Error("Changing transaction customer is not allowed.");
    }

    const customerRef  = doc(db, CUSTOMERS_COLLECTION, data.customerId);
    const customerSnap = await tx.get(customerRef);
    if (!customerSnap.exists()) throw new Error("Customer not found.");

    const currentBalance = (customerSnap.data()?.balance as number) ?? 0;
    const oldDelta       = existing.type === "credit" ? existing.amount : -existing.amount;
    const newDelta       = data.type === "credit" ? data.amount : -data.amount;

    tx.update(customerRef, { balance: currentBalance + newDelta - oldDelta });

    const payload: Record<string, unknown> = {
      type:   data.type,
      amount: data.amount,
      note:   data.note || null,
      lastEditedAmount: existing.amount,
      lastEditedAt: serverTimestamp(),
      lastEditedBy: auth.currentUser?.email ?? null,
    };
    tx.update(ledgerRef, payload);
  });
}

export function subscribeToLedgerEntries(
  customerId: string,
  onChange: (entries: LedgerEntry[]) => void
): () => void {
  const q = query(
    collection(db, LEDGER_COLLECTION),
    where("customerId", "==", customerId)
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs
      .map((d) => docToLedgerEntry(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    onChange(entries);
  });
}

// ─── Employee Ledger ─────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  joiningDate: string;
  salary: number;
  phone?: string;
  address?: string;
  /** Running balance: credit increases (advance taken), debit decreases (paid out). */
  balance: number;
  createdAt?: string;
}

export interface EmployeeCreate {
  name: string;
  joiningDate: string;
  salary: number;
  phone?: string;
  address?: string;
}

export interface EmployeeLedgerEntry {
  id: string;
  employeeId: string;
  type: LedgerEntryType;
  amount: number;
  note?: string;
  createdAt?: string;
}

export interface EmployeeLedgerEntryCreate {
  employeeId: string;
  type: LedgerEntryType;
  amount: number;
  note?: string;
}

const EMPLOYEES_COLLECTION       = "employees";
const EMPLOYEE_LEDGER_COLLECTION = "employeeLedgerEntries";

function docToEmployee(id: string, data: Record<string, unknown>): Employee {
  return {
    id,
    name:        (data.name        as string) ?? "",
    joiningDate: (data.joiningDate as string) ?? "",
    salary:      (data.salary      as number) ?? 0,
    phone:       (data.phone       as string) ?? undefined,
    address:     (data.address     as string) ?? undefined,
    balance:     (data.balance     as number) ?? 0,
    createdAt:   tsToString(data.createdAt),
  };
}

function docToEmployeeLedgerEntry(
  id: string,
  data: Record<string, unknown>
): EmployeeLedgerEntry {
  return {
    id,
    employeeId: (data.employeeId as string)        ?? "",
    type:       (data.type       as LedgerEntryType) ?? "credit",
    amount:     (data.amount     as number)          ?? 0,
    note:       (data.note       as string)          ?? undefined,
    createdAt:  tsToString(data.createdAt),
  };
}

export async function addEmployee(data: EmployeeCreate): Promise<Employee> {
  const ref = await addDoc(collection(db, EMPLOYEES_COLLECTION), {
    ...data,
    balance: 0,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, EMPLOYEES_COLLECTION, ref.id));
  return docToEmployee(ref.id, snap.data() as Record<string, unknown>);
}

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeCreate>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.joiningDate !== undefined) payload.joiningDate = data.joiningDate;
  if (data.salary !== undefined) payload.salary = data.salary;
  if (data.phone !== undefined) payload.phone = data.phone || null;
  if (data.address !== undefined) payload.address = data.address || null;
  await updateDoc(doc(db, EMPLOYEES_COLLECTION, id), payload);
}

export async function deleteEmployee(id: string): Promise<void> {
  const ledgerSnap = await getDocs(
    query(collection(db, EMPLOYEE_LEDGER_COLLECTION), where("employeeId", "==", id))
  );

  await Promise.all(ledgerSnap.docs.map((entry) => deleteDoc(entry.ref)));
  await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
}

export function subscribeToEmployees(
  onChange: (employees: Employee[]) => void
): () => void {
  return onSnapshot(collection(db, EMPLOYEES_COLLECTION), (snap) => {
    const employees = snap.docs
      .map((d) => docToEmployee(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name));
    onChange(employees);
  });
}

/**
 * Credit increases payable to employee, debit decreases it.
 */
export async function addEmployeeLedgerEntry(
  data: EmployeeLedgerEntryCreate
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const employeeRef  = doc(db, EMPLOYEES_COLLECTION, data.employeeId);
    const employeeSnap = await tx.get(employeeRef);
    const current      = (employeeSnap.data()?.balance as number) ?? 0;
    const delta        = data.type === "credit" ? data.amount : -data.amount;
    tx.update(employeeRef, { balance: current + delta });

    const ledgerRef = doc(collection(db, EMPLOYEE_LEDGER_COLLECTION));
    const payload: Record<string, unknown> = {
      employeeId: data.employeeId,
      type:       data.type,
      amount:     data.amount,
      createdAt:  serverTimestamp(),
    };
    if (data.note) payload.note = data.note;
    tx.set(ledgerRef, payload);
  });
}

export function subscribeToEmployeeLedgerEntries(
  employeeId: string,
  onChange: (entries: EmployeeLedgerEntry[]) => void
): () => void {
  const q = query(
    collection(db, EMPLOYEE_LEDGER_COLLECTION),
    where("employeeId", "==", employeeId)
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs
      .map((d) => docToEmployeeLedgerEntry(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    onChange(entries);
  });
}
