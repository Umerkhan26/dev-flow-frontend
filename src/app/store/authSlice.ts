import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "../../lib/api";

export type User = { id: string; name: string; email: string };
export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt?: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem("devflow.auth") ?? "null");
  } catch {
    return null;
  }
})();

const initialState: AuthState = {
  user: stored?.user ?? null,
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  workspaces: [],
  activeWorkspaceId: stored?.activeWorkspaceId ?? null,
  status: "idle",
  error: null,
};

function persist(state: AuthState) {
  localStorage.setItem(
    "devflow.auth",
    JSON.stringify({
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      activeWorkspaceId: state.activeWorkspaceId,
    }),
  );
}

export const register = createAsyncThunk(
  "auth/register",
  async (payload: { name: string; email: string; password: string }) => {
    return apiRequest<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/register",
      { body: payload },
    );
  },
);

export const login = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }) => {
    return apiRequest<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { body: payload },
    );
  },
);

export const fetchWorkspaces = createAsyncThunk(
  "auth/fetchWorkspaces",
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    return apiRequest<{ workspaces: Workspace[] }>("/api/workspaces", {
      token: state.auth.accessToken,
    });
  },
);

export const createWorkspace = createAsyncThunk(
  "auth/createWorkspace",
  async (payload: { name: string }, { getState }) => {
    const state = getState() as { auth: AuthState };
    return apiRequest<{ workspace: Workspace }>("/api/workspaces", {
      method: "POST",
      body: payload,
      token: state.auth.accessToken,
    });
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.workspaces = [];
      state.activeWorkspaceId = null;
      state.error = null;
      localStorage.removeItem("devflow.auth");
    },
    setActiveWorkspace(state, action: PayloadAction<string>) {
      state.activeWorkspaceId = action.payload;
      persist(state);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const authPending = (state: AuthState) => {
      state.status = "loading";
      state.error = null;
    };
    const authRejected = (state: AuthState, action: { error: { message?: string } }) => {
      state.status = "failed";
      state.error = action.error.message ?? "Something went wrong";
    };
    const authFulfilled = (
      state: AuthState,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>,
    ) => {
      state.status = "succeeded";
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    };

    builder
      .addCase(register.pending, authPending)
      .addCase(register.fulfilled, authFulfilled)
      .addCase(register.rejected, authRejected)
      .addCase(login.pending, authPending)
      .addCase(login.fulfilled, authFulfilled)
      .addCase(login.rejected, authRejected)
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.workspaces = action.payload.workspaces;
        if (!state.activeWorkspaceId && action.payload.workspaces[0]) {
          state.activeWorkspaceId = action.payload.workspaces[0].id;
          persist(state);
        }
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload.workspace);
        state.activeWorkspaceId = action.payload.workspace.id;
        persist(state);
      });
  },
});

export const { logout, setActiveWorkspace, clearError } = authSlice.actions;
export default authSlice.reducer;
