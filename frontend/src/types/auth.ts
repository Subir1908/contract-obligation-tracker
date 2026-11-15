import type { ContractObligation, DocumentMetadata } from './obligation';

export type UserRole = 'ADMIN_LEGAL_OFFICER' | 'DEPARTMENT_MANAGER' | 'ACADEMIC_EVALUATOR';

export interface UserAccount {
  userId: string;
  email: string;
  name: string;
  organization: string; // Tenant / Organization isolation key (FR-1.3)
  role: UserRole;
  token: string; // Time-bound JWT token (FR-1.2)
  tokenExpiresAt: number; // Unix timestamp in ms
}

export interface StoredContractRecord {
  contractId: string;
  userId: string;
  organization: string; // Multi-tenant / Org boundary
  fileName: string;
  fileType: 'PDF' | 'DOCX';
  uploadDate: string;
  processingStatus: 'UPLOADED' | 'PARSED' | 'VERIFIED';
  metadata: DocumentMetadata;
  obligations: ContractObligation[];
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  org: string; // organization key
  role: UserRole;
  iat: number;
  exp: number; // Expiration timestamp
}

