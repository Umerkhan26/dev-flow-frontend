import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

export type LiveNotification = {
  id?: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  workspaceId: string;
  createdAt?: string;
  readAt?: string | null;
};

type Handlers = {
  onNotification?: (n: LiveNotification) => void;
  onActivity?: (n: LiveNotification) => void;
};

let socket: Socket | null = null;
let joinedWorkspaceId: string | null = null;

export function connectSocket(token: string, handlers: Handlers = {}) {
  if (socket?.connected) {
    socket.auth = { token };
    return socket;
  }

  socket?.disconnect();
  socket = io(API_URL, {
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: { token },
  });

  socket.off("notification:new");
  socket.off("workspace:activity");

  if (handlers.onNotification) {
    socket.on("notification:new", handlers.onNotification);
  }
  if (handlers.onActivity) {
    socket.on("workspace:activity", handlers.onActivity);
  }

  return socket;
}

export function joinWorkspace(workspaceId: string) {
  if (!socket || !workspaceId) return;
  if (joinedWorkspaceId === workspaceId && socket.connected) return;
  socket.emit("workspace:join", workspaceId, (ok: boolean) => {
    if (ok) joinedWorkspaceId = workspaceId;
  });
}

export function disconnectSocket() {
  joinedWorkspaceId = null;
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
