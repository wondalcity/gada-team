import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "APPLICATION"
  | "SCOUT"
  | "STATUS_CHANGE"
  | "SYSTEM"
  | "MARKETING";

export interface WorkerNotification {
  publicId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  content: WorkerNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function getMyNotifications(
  page = 0
): Promise<NotificationListResponse> {
  return api.get<NotificationListResponse>(
    `/notifications/mine?page=${page}&size=20`
  );
}

export function markNotificationRead(publicId: string): Promise<void> {
  return api.post<void>(`/notifications/${publicId}/read`, {});
}

export function markAllNotificationsRead(): Promise<void> {
  return api.post<void>("/notifications/read-all", {});
}
