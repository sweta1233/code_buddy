"use client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("codebuddy_token");
}

export function setToken(token: string) {
  localStorage.setItem("codebuddy_token", token);
}

export function clearToken() {
  localStorage.removeItem("codebuddy_token");
  localStorage.removeItem("codebuddy_user");
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return res.json();
}

/** POST that returns a file download instead of JSON. */
export async function apiDownload(path: string, body: unknown, filename: string) {
  const token = getToken();
  const isMultipart = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...(!isMultipart ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: isMultipart ? body : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      throw new Error(`Cannot reach the backend at ${API_URL}. Start the backend from the backend folder with: uv run uvicorn app.main:app --port 8000 --reload`);
    }
    throw cause;
  }
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = `Download failed (${res.status})`;
    try {
      const response = await res.json();
      detail = response.detail || detail;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Keep the object URL alive until the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
