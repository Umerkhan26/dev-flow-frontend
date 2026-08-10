export type UserRef = { id: string; name: string; email: string };

export type Project = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  workspaceId: string;
  issueCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
  workspaceId?: string;
};

export type Issue = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  cycleId?: string | null;
  project?: { id: string; name: string; key: string; workspaceId: string };
  cycle?: { id: string; name: string; status: string } | null;
  reporter: UserRef;
  assignee: UserRef | null;
  labels: Label[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Cycle = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  projectId: string;
  project?: { id: string; name: string; key: string; workspaceId: string };
  issueCount: number;
  doneCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
};

export type IssueComment = {
  id: string;
  body: string;
  author: UserRef;
  createdAt: string;
  updatedAt: string;
};

export const ISSUE_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
] as const;

export const BOARD_COLUMNS = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export const CYCLE_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;

export const ISSUE_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function formatIssueKey(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}
