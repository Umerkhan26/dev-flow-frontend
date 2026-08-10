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
  project?: { id: string; name: string; key: string; workspaceId: string };
  reporter: UserRef;
  assignee: UserRef | null;
  labels: Label[];
  commentCount?: number;
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

export const ISSUE_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function formatIssueKey(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}
