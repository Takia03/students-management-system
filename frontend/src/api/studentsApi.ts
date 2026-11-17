import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from '@/types/student';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
}

const ACCESS_TOKEN_KEY = 'access_token';
const inFlightGets = new Map<string, Promise<unknown>>();

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
  student_id: number | null;
  profile_image_url: string | null;
  student: { id: number; name: string; email: string } | null;
}

export function getProfileImageUrl(path: string) {
  return `${API}${path}`;
}

export async function uploadProfilePicture(file: File): Promise<UserProfile> {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API}/auth/me/profile-picture`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) clearAccessToken();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message) ? err.message.join(', ') : err.message || message;
    } catch { /* keep the default message */ }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<UserProfile>;
}

export function saveAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.dispatchEvent(new Event('auth-change'));
  }
}

export function hasAccessToken() {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function clearAccessToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.dispatchEvent(new Event('auth-change'));
  }
}

// an Error that also carries the HTTP status code
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type StudentSortField = 'id' | 'name' | 'email' | 'created_at';
export type SortOrder = 'asc' | 'desc';

// one function for every HTTP call
async function request<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;
  const getKey = method === 'GET' && !signal ? `${token ?? ''}:${path}` : null;
  if (getKey) {
    const pending = inFlightGets.get(getKey) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const task = requestUncached<T>(path, { method, body, signal }, token);
  if (getKey) {
    inFlightGets.set(getKey, task);
    void task.finally(() => {
      if (inFlightGets.get(getKey) === task) inFlightGets.delete(getKey);
    }).catch(() => undefined);
  }
  return task;
}

async function requestUncached<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions,
  token: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401) {
    clearAccessToken();
  }

  if (!res.ok) {
    // Nest sends { message, error, statusCode }; for validation errors
    // "message" is an array, so join it into one readable string
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch {
      // body was not JSON, keep the default message
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });
  saveAccessToken(result.access_token);
  return result;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
  saveAccessToken(result.access_token);
  return result;
}

export function getProfile(signal?: AbortSignal): Promise<UserProfile> {
  return request<UserProfile>('/auth/me', { signal });
}

// make the date readable for the grid
const format = (s: Student): Student => ({
  ...s,
  created_at: new Date(s.created_at).toLocaleString(),
});

export interface StudentPage {
  data: Student[];
  total: number;
}

function formatPage(page: StudentPage): StudentPage {
  return { ...page, data: page.data.map(format) };
}

// READ: GET /students?page=0&limit=10
export async function getStudents(
  page: number,
  limit: number,
  signal?: AbortSignal,
  sortBy: StudentSortField = 'created_at',
  sortOrder: SortOrder = 'desc',
): Promise<StudentPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  const result = await request<StudentPage>(`/students?${params}`, { signal });
  return formatPage(result);
}

// READ: GET /students/search?q=...&page=0&limit=10
export async function searchStudents(
  q: string,
  page: number,
  limit: number,
  signal?: AbortSignal,
  sortBy: StudentSortField = 'created_at',
  sortOrder: SortOrder = 'desc',
): Promise<StudentPage> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  const result = await request<StudentPage>(
    `/students/search?${params}`,
    { signal },
  );
  return formatPage(result);
}

// READ one: GET /students/:id
export function getStudent(id: number, signal?: AbortSignal) {
  return request<Student>(`/students/${id}`, { signal });
}

// CREATE: POST /students
export function createStudent(student: CreateStudentInput) {
  return request<Student>('/students', { method: 'POST', body: student });
}

// UPDATE (replace): PUT /students/:id
export function updateStudent(id: number, student: CreateStudentInput) {
  return request<Student>(`/students/${id}`, { method: 'PUT', body: student });
}

// UPDATE (partial): PATCH /students/:id
export function patchStudent(id: number, changes: UpdateStudentInput) {
  return request<Student>(`/students/${id}`, { method: 'PATCH', body: changes });
}

// DELETE: DELETE /students/:id
export function deleteStudent(id: number) {
  return request<{ message: string; student: Student }>(`/students/${id}`, {
    method: 'DELETE',
  });
}

export interface GalleryPhoto {
  id: number;
  image_url: string;
  created_at: string;
}

export async function getGalleryPhotos(signal?: AbortSignal): Promise<GalleryPhoto[]> {
  return request<GalleryPhoto[]>('/auth/me/gallery', { signal });
}

export async function uploadGalleryPhotos(
  files: File[],
): Promise<GalleryPhoto[]> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
      : null;

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const res = await fetch(`${API}/auth/me/gallery`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) clearAccessToken();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch {
      // Keep the default message.
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<GalleryPhoto[]>;
}

export interface studentImportResult{
  importedCount: number;
  failedCount : number;
  skippedCount?: number;
  imported : Student[];
  errors: {row: number; reason: string}[];
  emailErrors: {row: number; email: string; reason: string}[];
}

export type ImportPreviewRow = {
  row: number;
  name: string;
  email: string;
  reasons: string[];
  valid: boolean;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
};

async function readImportResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) clearAccessToken();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch {
      // Keep the default message.
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export async function previewStudentsExcel(file: File): Promise<ImportPreviewResult> {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API}/students/import/preview`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return readImportResponse<ImportPreviewResult>(res);
}

export async function confirmStudentImport(
  rows: { row: number; name: string; email: string }[],
): Promise<studentImportResult> {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
    : null;

  const res = await fetch(`${API}/students/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(rows),
  });

  return readImportResponse<studentImportResult>(res);
}

export async function importStudentsExcel(file: File) : Promise<studentImportResult>{
  const token = typeof window !== 'undefined'
  ? window.localStorage.getItem(ACCESS_TOKEN_KEY)
  : null;

  const formData = new FormData();
  formData.append('file',file);
  
  const res = await fetch(`${API}/students/import` , {
    method : 'POST',
    headers : token ? { Authorization: `Bearer ${token}`} : {},
    body : formData,
  });

  if (res.status === 401) clearAccessToken();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch {
      // Keep the default message.
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<studentImportResult>;
}


export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
}

