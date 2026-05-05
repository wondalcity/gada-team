import { api } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatRoomSummary {
  publicId: string;
  teamPublicId: string;
  teamName: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface WorkerChatRoomSummary {
  publicId: string;
  teamPublicId: string;
  teamName: string | null;
  employerName: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface ChatRoomDetail {
  publicId: string;
  teamPublicId: string;
  teamName: string | null;
  pointsUsed: number;
  createdAt: string;
}

export interface ChatMessageItem {
  publicId: string;
  senderId: number;
  isMine: boolean;
  content: string;
  messageType: "TEXT" | "CONTRACT";
  contractPublicId?: string;
  createdAt: string;
}

export interface MemberProposalItem {
  publicId: string;
  teamPublicId: string;
  teamName: string | null;
  proposerName: string | null;
  proposerPublicId: string | null;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  respondedAt: string | null;
  createdAt: string;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ── Employer Chat API ──────────────────────────────────────────────────────────

export const chatApi = {
  openRoom: (teamPublicId: string) =>
    api.post<ChatRoomDetail>("/employer/chats/rooms", { teamPublicId }),

  listRooms: (page = 0, size = 20) =>
    api.get<PageResponse<ChatRoomSummary>>(`/employer/chats/rooms?page=${page}&size=${size}`),

  getRoom: (roomPublicId: string) =>
    api.get<ChatRoomSummary>(`/employer/chats/rooms/${roomPublicId}`),

  getMessages: (roomPublicId: string, page = 0, size = 50) =>
    api.get<PageResponse<ChatMessageItem>>(`/employer/chats/rooms/${roomPublicId}/messages?page=${page}&size=${size}`),

  sendMessage: (roomPublicId: string, content: string) =>
    api.post<ChatMessageItem>(`/employer/chats/rooms/${roomPublicId}/messages`, { content }),
};

// ── Worker/Leader Chat API ─────────────────────────────────────────────────────

export const workerChatApi = {
  listRooms: (page = 0, size = 20) =>
    api.get<PageResponse<WorkerChatRoomSummary>>(`/worker/chats/rooms?page=${page}&size=${size}`),

  getRoom: (roomPublicId: string) =>
    api.get<WorkerChatRoomSummary>(`/worker/chats/rooms/${roomPublicId}`),

  getMessages: (roomPublicId: string, page = 0, size = 50) =>
    api.get<PageResponse<ChatMessageItem>>(`/worker/chats/rooms/${roomPublicId}/messages?page=${page}&size=${size}`),

  sendMessage: (roomPublicId: string, content: string) =>
    api.post<ChatMessageItem>(`/worker/chats/rooms/${roomPublicId}/messages`, { content }),
};

// ── Worker Team Proposal API (팀장이 받은 기업 담당자 채용 제안) ─────────────────────────────

export interface WorkerTeamProposalItem {
  publicId: string;
  teamPublicId: string;
  jobPublicId: string;
  jobTitle: string | null;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  respondedAt: string | null;
  createdAt: string;
}

export const workerTeamProposalApi = {
  listReceived: (page = 0, size = 20, teamPublicId?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (teamPublicId) params.set("teamPublicId", teamPublicId);
    return api.get<PageResponse<WorkerTeamProposalItem>>(`/worker/teams/proposals?${params}`);
  },

  respond: (proposalPublicId: string, status: "ACCEPTED" | "DECLINED") =>
    api.put<WorkerTeamProposalItem>(`/worker/teams/proposals/${proposalPublicId}`, { status }),
};

// ── Direct Chat API (worker ↔ worker / leader ↔ member) ───────────────────────

export interface DirectChatRoomResponse {
  publicId: string;
  myId: number;
  otherId: number;
  otherName: string | null;
  otherProfileImageUrl: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface DirectChatRoomSummary {
  publicId: string;
  otherUserId: number;
  otherName: string | null;
  otherProfileImageUrl: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface DirectChatMessageItem {
  publicId: string;
  senderId: number;
  isMine: boolean;
  content: string;
  createdAt: string;
}

export const directChatApi = {
  openRoom: (workerProfilePublicId: string) =>
    api.post<DirectChatRoomResponse>(`/worker/direct-chats/open?workerProfilePublicId=${encodeURIComponent(workerProfilePublicId)}`, {}),

  listRooms: (page = 0, size = 20) =>
    api.get<PageResponse<DirectChatRoomSummary>>(`/worker/direct-chats/rooms?page=${page}&size=${size}`),

  getRoom: (roomPublicId: string) =>
    api.get<DirectChatRoomSummary>(`/worker/direct-chats/rooms/${roomPublicId}`),

  getMessages: (roomPublicId: string, page = 0, size = 50) =>
    api.get<PageResponse<DirectChatMessageItem>>(`/worker/direct-chats/rooms/${roomPublicId}/messages?page=${page}&size=${size}`),

  sendMessage: (roomPublicId: string, content: string) =>
    api.post<DirectChatMessageItem>(`/worker/direct-chats/rooms/${roomPublicId}/messages`, { content }),
};

// ── Worker Points API (team leader balance) ────────────────────────────────────

export interface TlPointBalanceResponse {
  balance: number;
  totalCharged: number;
  totalUsed: number;
  updatedAt: string;
}

export interface TlPointChargeItem {
  publicId: string;
  amountKrw: number;
  pointsToAdd: number;
  paymentMethod: string;
  status: string;
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export const workerPointsApi = {
  getBalance: () =>
    api.get<TlPointBalanceResponse>("/worker/points"),

  listChargeRequests: (page = 0, size = 20) =>
    api.get<PageResponse<TlPointChargeItem>>(`/worker/points/charges?page=${page}&size=${size}`),

  requestCharge: (amountKrw: number, paymentMethod: "CASH" | "CARD") =>
    api.post<TlPointChargeItem>("/worker/points/charges", { amountKrw, paymentMethod }),

  confirmCardPayment: (paymentKey: string, orderId: string, amountKrw: number) =>
    api.post<TlPointChargeItem>("/worker/points/charges/card-confirm", { paymentKey, orderId, amountKrw }),
};

// ── Member Proposal API ────────────────────────────────────────────────────────

export const memberProposalApi = {
  sendProposal: (teamPublicId: string, message?: string) =>
    api.post<MemberProposalItem>(`/teams/${teamPublicId}/member-proposals`, { message }),

  mySentProposals: (page = 0, size = 20) =>
    api.get<PageResponse<MemberProposalItem>>(`/worker/member-proposals/sent?page=${page}&size=${size}`),

  receivedProposals: (page = 0, size = 20) =>
    api.get<PageResponse<MemberProposalItem>>(`/teams/mine/member-proposals?page=${page}&size=${size}`),

  respondToProposal: (proposalPublicId: string, status: "ACCEPTED" | "DECLINED") =>
    api.put<MemberProposalItem>(`/teams/mine/member-proposals/${proposalPublicId}`, { status }),
};
