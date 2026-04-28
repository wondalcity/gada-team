import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "EXPIRED" | "CANCELLED";

export interface ContractSummary {
  publicId: string;
  applicationPublicId?: string;
  jobTitle?: string;
  status: ContractStatus;
  sentAt?: string;
  workerSignedAt?: string;
  employerSignedAt?: string;
  createdAt: string;
}

export interface ContractDetail extends ContractSummary {
  startDate?: string;
  endDate?: string;
  payAmount?: number;
  payUnit?: string;
  terms?: string;
  documentUrl?: string;
}

export interface CreateContractPayload {
  startDate?: string;
  endDate?: string;
  payAmount?: number;
  payUnit?: string;
  terms?: string;
  documentUrl?: string;
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export const contractsApi = {
  /** Worker: list all my contracts */
  getMine: () => api.get<ContractSummary[]>("/contracts/mine"),

  /** Worker/Employer: get one contract by publicId */
  getOne: (publicId: string) => api.get<ContractDetail>(`/contracts/${publicId}`),

  /** Worker: sign a contract */
  sign: (publicId: string) => api.post<ContractDetail>(`/contracts/${publicId}/sign`, {}),

  /** Employer: send a contract for an application (must be HIRED) */
  sendForApplication: (applicationPublicId: string, payload: CreateContractPayload) =>
    api.post<ContractDetail>(`/contracts/applications/${applicationPublicId}`, payload),

  /** Employer: get contract linked to an application */
  getByApplication: (applicationPublicId: string) =>
    api.get<ContractDetail | null>(`/contracts/applications/${applicationPublicId}`),
};
