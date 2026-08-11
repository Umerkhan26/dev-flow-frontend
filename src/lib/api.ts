const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Skip refresh+logout handling (used for login/register/refresh itself). */
  skipAuthRefresh?: boolean;
};

type StoredAuth = {
  user: { id: string; name: string; email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeWorkspaceId: string | null;
};

function readStoredAuth(): StoredAuth | null {
  try {
    return JSON.parse(localStorage.getItem("devflow.auth") ?? "null") as StoredAuth | null;
  } catch {
    return null;
  }
}

function writeStoredAuth(partial: Partial<StoredAuth>) {
  const current = readStoredAuth() ?? {
    user: null,
    accessToken: null,
    refreshToken: null,
    activeWorkspaceId: null,
  };
  localStorage.setItem("devflow.auth", JSON.stringify({ ...current, ...partial }));
}

let refreshPromise: Promise<string | null> | null = null;
let forcingLogout = false;

async function syncStoreSession(payload: {
  user: { id: string; name: string; email: string };
  accessToken: string;
  refreshToken: string;
}) {
  writeStoredAuth({
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
  const { store } = await import("../app/store");
  const { setSession } = await import("../app/store/authSlice");
  store.dispatch(setSession(payload));
}

async function forceLogout() {
  if (forcingLogout) return;
  forcingLogout = true;
  try {
    localStorage.removeItem("devflow.auth");
    try {
      const { disconnectSocket } = await import("./socket");
      disconnectSocket();
    } catch {
      /* ignore */
    }
    const { store } = await import("../app/store");
    const { logout } = await import("../app/store/authSlice");
    store.dispatch(logout());
    const path = window.location.pathname;
    if (!path.startsWith("/login") && !path.startsWith("/register")) {
      window.location.assign("/login");
    }
  } finally {
    forcingLogout = false;
  }
}

function isAuthPublicPath(path: string) {
  return (
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register") ||
    path.startsWith("/api/auth/refresh")
  );
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readStoredAuth()?.refreshToken;
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.accessToken || !data?.refreshToken || !data?.user) {
      return null;
    }

    await syncStoreSession({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (
    res.status === 401 &&
    !options.skipAuthRefresh &&
    !isAuthPublicPath(path)
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(path, {
        ...options,
        token: newToken,
        skipAuthRefresh: true,
      });
    }
    await forceLogout();
    throw new Error(data?.error?.message ?? "Session expired. Please sign in again.");
  }

  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Request failed");
  }
  return data as T;
}

export { API_URL };
