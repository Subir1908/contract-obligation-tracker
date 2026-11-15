export type TimelineStatus = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED';
export type CurrencyCode = 'INR' | 'USD';

export * from './auth';

export interface ContractObligation {
  id: string;
  description: string;
  responsibleParty: string;
  dueDate: string; // YYYY-MM-DD
  monetaryValue: number;
  latePenalty: string;
  sourceClause?: string; // FR-3.3 Verbatim clause snippet
  verificationStatus?: VerificationStatus; // FR-4.2 / ER Model
  riskLevel?: RiskLevel; // FR-7 Risk scoring
  category?: 'Deliverable' | 'Payment' | 'SLA' | 'Compliance' | 'Audit' | 'Legal' | 'Other';
  notes?: string;
  isCompleted?: boolean;
  confidenceScore?: number; // 0.0 - 1.0 (extraction confidence)
}

export interface UrgencyInfo {
  status: TimelineStatus;
  daysDiff: number; // Negative = overdue, 0 = due today, positive = upcoming
  label: string;
  formattedDelta: string;
}

export interface RiskInfo {
  level: RiskLevel;
  score: number;
  label: string;
  reasons: string[];
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: string;
  pageCount: number;
  uploadedAt: string;
  contractTitle: string;
  contractType: string;
  parties: string[];
  rawTextPreview?: string; // FR-2.4 selectable raw text / clause viewer
}

export interface ParsingStageStatus {
  stage: 'pending' | 'in_progress' | 'completed' | 'error';
}

export interface ParsingStage {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

export interface FilterConfig {
  searchQuery: string;
  statusFilter: 'ALL' | TimelineStatus;
  riskFilter?: 'ALL' | RiskLevel;
  partyFilter: string;
  sortField: 'dueDate' | 'monetaryValue' | 'responsibleParty' | 'description' | 'urgency';
  sortOrder: 'asc' | 'desc';
}

export interface NotificationToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}
