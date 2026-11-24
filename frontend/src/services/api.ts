import type { UserAccount, UserRole, StoredContractRecord } from '../types/auth';
import type { ContractObligation, DocumentMetadata, RiskLevel, VerificationStatus } from '../types/obligation';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://127.0.0.1:8000';

const TOKEN_STORAGE_KEY = 'cot_backend_access_token';
const USER_STORAGE_KEY = 'cot_backend_user_session';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthSession(token: string, user: UserAccount): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredBackendUser(): UserAccount | null {
  try {
    const token = getAccessToken();
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!token || !rawUser) return null;
    const parsed: UserAccount = JSON.parse(rawUser);
    if (parsed.tokenExpiresAt && Date.now() > parsed.tokenExpiresAt) {
      clearAuthSession();
      return null;
    }
    return { ...parsed, token };
  } catch {
    return null;
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg || String(d)).join(', ');
    }
  } catch {
    // ignore JSON parse failure
  }
  return `${fallback} (HTTP ${res.status})`;
}

// --- AUTHENTICATION API ---

export async function loginWithBackend(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (!res.ok) {
      return { success: false, error: await parseErrorDetail(res, 'Login failed') };
    }

    const data = await res.json();
    const expiresAt =
      typeof data.tokenExpiresAt === 'number'
        ? data.tokenExpiresAt
        : Date.now() + 8 * 60 * 60 * 1000;

    const user: UserAccount = {
      userId: String(data.userId || data.user_id || email),
      email: data.email || email.trim().toLowerCase(),
      name: data.name || email.split('@')[0],
      organization: data.organization || 'Tezpur University Legal Cell',
      role: (data.role || 'ADMIN_LEGAL_OFFICER') as UserRole,
      token: data.access_token || data.accessToken,
      tokenExpiresAt: expiresAt,
    };

    setAuthSession(user.token, user);
    return { success: true, user };
  } catch {
    return {
      success: false,
      error: `Cannot reach backend at ${API_BASE_URL}. Make sure FastAPI is running on port 8000.`,
    };
  }
}

export async function registerWithBackend(params: {
  email: string;
  password: string;
  name: string;
  organization: string;
  role: UserRole;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        name: params.name.trim(),
        organization: params.organization.trim(),
        role: params.role,
      }),
    });

    if (!res.ok) {
      return { success: false, error: await parseErrorDetail(res, 'Registration failed') };
    }

    return await loginWithBackend(params.email, params.password);
  } catch {
    return {
      success: false,
      error: `Cannot reach backend at ${API_BASE_URL}. Make sure FastAPI is running on port 8000.`,
    };
  }
}

// --- MAPPERS (Backend <-> Frontend) ---

function mapBackendObligation(raw: Record<string, unknown>): ContractObligation {
  const numericId = raw.obligation_id ?? raw.obligationId ?? '';
  const dueRaw = raw.due_date ?? raw.dueDate;
  const dueDateStr = dueRaw ? String(dueRaw).slice(0, 10) : '';
  const rawVerify = String(raw.verification_status ?? raw.verificationStatus ?? 'UNVERIFIED').toUpperCase();
  const verificationStatus: VerificationStatus = rawVerify === 'VERIFIED' ? 'VERIFIED' : 'UNVERIFIED';
  const rawRisk = String(raw.risk_level ?? raw.riskLevel ?? 'MEDIUM').toUpperCase();
  const riskLevel: RiskLevel =
    rawRisk === 'HIGH' || rawRisk === 'MEDIUM' || rawRisk === 'LOW' ? rawRisk : 'MEDIUM';

  return {
    id: String(raw.id || (numericId ? `ob-${numericId}` : `ob-${Math.random().toString(36).slice(2, 7)}`)),
    description: String(raw.description || ''),
    responsibleParty: String(raw.responsible_party ?? raw.responsibleParty ?? 'Contracting Party'),
    dueDate: dueDateStr,
    monetaryValue: Number(raw.monetary_value ?? raw.monetaryValue ?? 0) || 0,
    latePenalty: String(raw.late_penalty ?? raw.latePenalty ?? 'None'),
    sourceClause: raw.source_clause ?? raw.sourceClause ? String(raw.source_clause ?? raw.sourceClause) : undefined,
    verificationStatus,
    riskLevel,
    category: (raw.category as ContractObligation['category']) || 'Deliverable',
    isCompleted: verificationStatus === 'VERIFIED',
  };
}

function mapBackendContract(
  raw: Record<string, unknown>,
  user: UserAccount,
  obligations: ContractObligation[] = []
): StoredContractRecord {
  const contractIdNum = raw.contract_id ?? raw.contractId ?? 0;
  const fileName = String(raw.filename || 'contract.pdf');
  const fileTypeRaw = String(raw.file_type ?? raw.fileType ?? 'PDF').toUpperCase();
  const fileType: 'PDF' | 'DOCX' = fileTypeRaw.includes('DOCX') ? 'DOCX' : 'PDF';
  const pageCount = Number(raw.page_count ?? raw.pageCount ?? 1) || 1;
  const uploadDate = String(raw.upload_date ?? raw.uploadDate ?? new Date().toISOString());

  const metadata: DocumentMetadata = {
    fileName,
    fileSize: 'Backend File',
    pageCount,
    uploadedAt: uploadDate,
    contractTitle: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    contractType: fileType === 'DOCX' ? 'Word Agreement (.docx)' : 'PDF Agreement (.pdf)',
    parties: [user.organization, 'Counterparty'],
  };

  return {
    contractId: String(contractIdNum),
    userId: String(raw.user_id ?? raw.userId ?? user.userId),
    organization: user.organization,
    fileName,
    fileType,
    uploadDate,
    processingStatus: 'PARSED',
    metadata,
    obligations,
  };
}

// --- CONTRACTS & NLP EXTRACTION API ---

export async function fetchUserContractsWithObligations(
  user: UserAccount
): Promise<StoredContractRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/contracts`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'Failed to fetch contracts'));
  }

  const rawContracts: Record<string, unknown>[] = await res.json();
  const records: StoredContractRecord[] = [];

  for (const c of rawContracts) {
    const cid = c.contract_id ?? c.contractId;
    let obs: ContractObligation[] = [];
    if (Array.isArray(c.obligations) && c.obligations.length > 0) {
      obs = (c.obligations as Record<string, unknown>[]).map(mapBackendObligation);
    } else if (typeof cid === 'string' || typeof cid === 'number') {
      obs = await fetchContractObligations(cid);
    }
    records.push(mapBackendContract(c, user, obs));
  }

  return records;
}

export async function fetchContractObligations(
  contractId: string | number
): Promise<ContractObligation[]> {
  const numericId = String(contractId).replace(/^ctr-/i, '');
  const res = await fetch(`${API_BASE_URL}/api/contracts/${numericId}/obligations`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'Failed to load obligations'));
  }
  const rows: Record<string, unknown>[] = await res.json();
  return rows.map(mapBackendObligation);
}

export async function uploadContractToBackend(
  file: File,
  user: UserAccount
): Promise<StoredContractRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/contracts/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'Contract upload & NLP extraction failed'));
  }

  const uploadData = await res.json();
  const contractId = String(uploadData.contract_id ?? uploadData.contractId ?? '');
  const pageCount = Number(uploadData.page_count ?? uploadData.pageCount ?? 1) || 1;
  const obligations = await fetchContractObligations(contractId);

  const metadata: DocumentMetadata = {
    fileName: uploadData.filename || file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    pageCount,
    uploadedAt: new Date().toISOString(),
    contractTitle: (uploadData.filename || file.name).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    contractType: file.name.toLowerCase().endsWith('.docx') ? 'DOCX Contract' : 'PDF Contract',
    parties: [user.organization, 'Counterparty'],
  };

  return {
    contractId,
    userId: user.userId,
    organization: user.organization,
    fileName: metadata.fileName,
    fileType: file.name.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
    uploadDate: metadata.uploadedAt,
    processingStatus: 'PARSED',
    metadata,
    obligations,
  };
}

// --- OBLIGATIONS CRUD API ---

export async function createObligationOnBackend(params: {
  contractId: string | number;
  description: string;
  responsibleParty: string;
  dueDate: string;
  monetaryValue: number;
  currency?: string;
  latePenalty: string;
  sourceClause?: string;
}): Promise<ContractObligation> {
  const numericContractId = Number(String(params.contractId).replace(/^ctr-/i, ''));
  const res = await fetch(`${API_BASE_URL}/api/obligations`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      contract_id: numericContractId,
      description: params.description,
      responsible_party: params.responsibleParty,
      due_date: params.dueDate || null,
      monetary_value: params.monetaryValue,
      currency: params.currency || 'INR',
      late_penalty: params.latePenalty,
      source_clause: params.sourceClause || 'Manually added by user',
    }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'Failed to create obligation'));
  }

  const created = await res.json();
  return mapBackendObligation(created);
}

export async function updateObligationOnBackend(
  obligationId: string,
  updates: Partial<ContractObligation>
): Promise<ContractObligation> {
  const numericId = obligationId.replace(/^ob-/i, '');
  const payload: Record<string, unknown> = {};

  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.responsibleParty !== undefined) payload.responsible_party = updates.responsibleParty;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
  if (updates.monetaryValue !== undefined) payload.monetary_value = updates.monetaryValue;
  if (updates.latePenalty !== undefined) payload.late_penalty = updates.latePenalty;
  if (updates.sourceClause !== undefined) payload.source_clause = updates.sourceClause;
  if (updates.riskLevel !== undefined) payload.risk_level = updates.riskLevel;
  if (updates.verificationStatus !== undefined) {
    payload.verification_status = updates.verificationStatus;
  }

  const res = await fetch(`${API_BASE_URL}/api/obligations/${numericId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, 'Failed to update obligation'));
  }

  const updated = await res.json();
  return mapBackendObligation(updated);
}

export async function deleteObligationOnBackend(obligationId: string): Promise<void> {
  const numericId = obligationId.replace(/^ob-/i, '');
  const res = await fetch(`${API_BASE_URL}/api/obligations/${numericId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorDetail(res, 'Failed to delete obligation'));
  }
}

export async function downloadBackendExport(
  contractId: string | number,
  format: 'csv' | 'xlsx' | 'ics',
  fallbackFilename: string
): Promise<void> {
  const numericId = String(contractId).replace(/^ctr-/i, '');
  const res = await fetch(`${API_BASE_URL}/api/contracts/${numericId}/export?format=${format}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, `Export (${format.toUpperCase()}) failed`));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fallbackFilename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteContractOnBackend(contractId: string | number): Promise<void> {
  const numericId = String(contractId).replace(/^ctr-/i, '');
  const res = await fetch(`${API_BASE_URL}/api/contracts/${numericId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorDetail(res, 'Failed to delete contract'));
  }
}
