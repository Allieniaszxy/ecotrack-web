export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "OPERATIONS_MANAGER";

export type Admin = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
};

export type Reading = {
  id: string;
  distance: number;
  fillLevel: number;
  receivedAt: string;
  topic: string;
};

export type Bin = {
  id: string;
  binId: string;
  name: string | null;
  location: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | string;
  createdAt: string;
  latestReading: Reading | null;
  _count: { readings: number };
};

export type AlertSeverity = "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export type BinAlert = {
  id: string;
  binId: string;
  severity: AlertSeverity;
  alertType: string;
  message: string;
  fillLevel: number;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  bin: { binId: string; name: string | null; location: string | null };
};

export type Collector = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  _count?: { assignments: number };
};

export type AssignmentStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ISSUE_REPORTED";

export type Priority = "NORMAL" | "HIGH" | "CRITICAL";

export type StatusHistoryEntry = {
  id: string;
  status: AssignmentStatus;
  note: string | null;
  changedAt: string;
};

export type AssignmentBin = {
  binId: string;
  name: string | null;
  location: string | null;
  status?: string;
  readings?: Reading[];
};

export type Assignment = {
  id: string;
  binId: string;
  collectorId: string;
  status: AssignmentStatus;
  priority: Priority;
  scheduledFor: string | null;
  assignedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  bin: AssignmentBin;
  collector: Pick<Collector, "id" | "fullName" | "email" | "phone" | "status">;
  statusHistory: StatusHistoryEntry[];
  /** Present on live socket events: who triggered the change. */
  changedBy?: "ADMIN" | "COLLECTOR";
};

export type BinEmptiedEvent = {
  binId: string;
  name: string | null;
  location: string | null;
  previousFill: number;
  fillLevel: number;
  at: string;
};

export type OverviewStats = {
  totalBins: number;
  activeBins: number;
  activeCollectors: number;
  openAlerts: number;
  criticalAlerts: number;
  assignments: Partial<Record<AssignmentStatus, number>>;
};

export type AnalyticsData = {
  days: number;
  daily: { date: string; collections: number; alerts: number }[];
  topCollectors: { collectorId: string; fullName: string; completed: number }[];
};

export type ListResponse<T> = { success: boolean; count?: number; data: T };
export type ItemResponse<T> = { success: boolean; message?: string; data: T };

export const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "ISSUE_REPORTED",
];

export function getBinState(bin: Bin) {
  if (bin.status === "MAINTENANCE") return "MAINTENANCE";
  if (bin.status !== "ACTIVE") return "INACTIVE";
  const fill = bin.latestReading?.fillLevel;
  if (fill === undefined) return "NO DATA";
  if (fill >= 90) return "CRITICAL";
  if (fill >= 75) return "HIGH";
  if (fill >= 50) return "FILLING";
  return "NORMAL";
}

/** A sensor that has not reported for this long is treated as offline. */
export const SENSOR_OFFLINE_AFTER_MS = 2 * 60 * 1000;
