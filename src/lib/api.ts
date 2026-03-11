// ─── API Base ───────────────────────────────────────────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Token Helpers ───────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

export function clearAuth(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
}

// ─── Core Fetch Wrapper ──────────────────────────────────────────────────────
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
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
  return fetchAPI<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<AdminUser> {
  return fetchAPI<AdminUser>("/api/auth/me");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  total: number;
  pending: number;
  arrived: number;
  notified: number;
  collected: number;
  cancelled: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>("/api/dashboard/stats");
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
  notes?: string;
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
  notes?: string;
}

export interface RequestListResponse {
  requests: MedicineRequest[];
  total: number;
}

export async function getRequests(
  search?: string,
  status?: string
): Promise<RequestListResponse> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "all") params.set("status", status);
  const q = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI<RequestListResponse>(`/api/requests${q}`);
}

export async function getRequest(id: string): Promise<MedicineRequest> {
  return fetchAPI<MedicineRequest>(`/api/requests/${id}`);
}

export async function createRequest(
  data: MedicineRequestCreate
): Promise<MedicineRequest> {
  return fetchAPI<MedicineRequest>("/api/requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRequest(
  id: string,
  data: Partial<MedicineRequestCreate & { status: RequestStatus }>
): Promise<MedicineRequest> {
  return fetchAPI<MedicineRequest>(`/api/requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRequest(id: string): Promise<{ message: string }> {
  return fetchAPI<{ message: string }>(`/api/requests/${id}`, {
    method: "DELETE",
  });
}

export async function markArrived(id: string): Promise<MedicineRequest> {
  return fetchAPI<MedicineRequest>(`/api/requests/${id}/arrived`, {
    method: "PATCH",
  });
}

export async function markCollected(id: string): Promise<MedicineRequest> {
  return fetchAPI<MedicineRequest>(`/api/requests/${id}/collected`, {
    method: "PATCH",
  });
}

export interface NotifyResponse {
  message: string;
  whatsappUrl: string;
  status: string;
}

export async function notifyCustomer(id: string): Promise<NotifyResponse> {
  return fetchAPI<NotifyResponse>(`/api/requests/${id}/notify`, {
    method: "POST",
  });
}
