import type { UserAccount, JwtPayload, UserRole, StoredContractRecord } from '../types/auth';
import type { ContractObligation, DocumentMetadata } from '../types/obligation';
import { DEMO_CONTRACT_BUNDLES } from '../data/mockContracts';
import { getTodayIsoString } from './dateUtils';

// Local storage keys
const AUTH_STORAGE_KEY = 'cot_auth_user_session';
const CONTRACTS_STORAGE_KEY = 'cot_tenant_contracts_v1';
const USERS_REGISTRY_KEY = 'cot_registered_users_v1';

export interface RegisteredUserRecord {
  email: string;
  passwordHash: string;
  name: string;
  org: string;
  role: UserRole;
}

// Default initial accounts for academic demo/evaluation
const INITIAL_REGISTERED_USERS: RegisteredUserRecord[] = [
  {
    email: 'mihir.csm25008@tezpur.ac.in',
    passwordHash: 'bcrypt$12$e8d3b7621f8a846b0a19c67b', // Mock bcrypt hash
    name: 'Mihir Kumar (Legal Officer)',
    org: 'Tezpur University Legal Cell',
    role: 'ADMIN_LEGAL_OFFICER'
  },
  {
    email: 'subir.csm25011@tezpur.ac.in',
    passwordHash: 'bcrypt$12$f91b7d52a4e21a8c9830da5e',
    name: 'Subir Debnath (Project Manager)',
    org: 'Tezpur University Legal Cell',
    role: 'DEPARTMENT_MANAGER'
  },
  {
    email: 'evaluator@tezpur.ac.in',
    passwordHash: 'bcrypt$12$736a19f20c83a71b489d2011',
    name: 'Prof. Evaluator',
    org: 'CSMC502 Software Engineering Lab',
    role: 'ACADEMIC_EVALUATOR'
  },
  {
    email: 'external.auditor@tcs.com',
    passwordHash: 'bcrypt$12$b12c98d7f21a478b01298cde',
    name: 'TCS Vendor Liaison',
    org: 'Tata Consultancy Services Ltd.',
    role: 'DEPARTMENT_MANAGER'
  }
];

/**
 * Creates standard RFC 7519 JSON Web Token (JWT) with HMAC-SHA256 structure
 * header.payload.signature
 */
export function generateJwtToken(payload: JwtPayload): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encode = (obj: unknown) => {
    return btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = encode(header);
  const encodedPayload = encode(payload);
  
  // Simulated cryptographic signature string
  const rawSignature = `${encodedHeader}.${encodedPayload}.cot_fastapi_backend_secret_key_csmc502`;
  const signature = btoa(rawSignature).slice(0, 32).replace(/\+/g, '-').replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Parses and verifies JWT expiration and structure
 */
export function parseJwtToken(token: string): { valid: boolean; payload?: JwtPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT token structure' };
    }

    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload: JwtPayload = JSON.parse(payloadJson);

    // Verify expiration (FR-1.2 time-bound enforcement)
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return { valid: false, error: 'JWT session token has expired. Please re-authenticate.' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token signature or payload decoding failure' };
  }
}

/**
 * Returns saved active user session from local storage or null
 */
export function getSavedSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const user: UserAccount = JSON.parse(raw);
    
    // Check if token has expired
    if (user.tokenExpiresAt && Date.now() > user.tokenExpiresAt) {
      clearSession();
      return null;
    }
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Saves authenticated user session
 */
export function saveSession(user: UserAccount): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Clears active user session (Logout - FR-1.2)
 */
export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * FR-1.1: Register a new user account
 */
export function registerUser(params: {
  email: string;
  password: string;
  name: string;
  organization: string;
  role: UserRole;
}): { success: boolean; user?: UserAccount; error?: string } {
  const users = getRegisteredUsers();
  const lowerEmail = params.email.trim().toLowerCase();

  if (users.some(u => u.email.toLowerCase() === lowerEmail)) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  
  // Issue 8-hour time-bound JWT token (FR-1.2)
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + 8 * 3600; // 8 hours duration

  const jwtPayload: JwtPayload = {
    sub: userId,
    email: lowerEmail,
    org: params.organization.trim(),
    role: params.role,
    iat: nowSec,
    exp: expSec
  };

  const token = generateJwtToken(jwtPayload);

  // Store in user registry
  users.push({
    email: lowerEmail,
    passwordHash: `bcrypt$12$${btoa(params.password).slice(0, 24)}`,
    name: params.name.trim(),
    org: params.organization.trim(),
    role: params.role
  });
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));

  const userAccount: UserAccount = {
    userId,
    email: lowerEmail,
    name: params.name.trim(),
    organization: params.organization.trim(),
    role: params.role,
    token,
    tokenExpiresAt: expSec * 1000
  };

  saveSession(userAccount);

  // Initialize a default sample contract for this new organization
  initializeTenantSeedContracts(userAccount);

  return { success: true, user: userAccount };
}

/**
 * FR-1.1: Authenticate user login
 */
export function authenticateUser(email: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
  const users = getRegisteredUsers();
  const lowerEmail = email.trim().toLowerCase();
  const found = users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!found) {
    return { success: false, error: 'Invalid email address or account not found.' };
  }

  // Password verification (simulated bcrypt verification)
  if (!password || password.length < 4) {
    return { success: false, error: 'Invalid password. Minimum 4 characters required.' };
  }

  const userId = `usr-${lowerEmail.replace(/[^a-z0-9]/g, '_')}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + 8 * 3600; // 8 hours duration

  const jwtPayload: JwtPayload = {
    sub: userId,
    email: lowerEmail,
    org: found.org,
    role: found.role,
    iat: nowSec,
    exp: expSec
  };

  const token = generateJwtToken(jwtPayload);

  const userAccount: UserAccount = {
    userId,
    email: lowerEmail,
    name: found.name,
    organization: found.org,
    role: found.role,
    token,
    tokenExpiresAt: expSec * 1000
  };

  saveSession(userAccount);
  return { success: true, user: userAccount };
}

/**
 * Helper to get registered users registry
 */
export function getRegisteredUsers(): RegisteredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (!raw) {
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(INITIAL_REGISTERED_USERS));
      return [...INITIAL_REGISTERED_USERS];
    }
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_REGISTERED_USERS];
  }
}

/**
 * FR-1.3: Tenant Data Isolation
 * Fetches all contracts strictly isolated by user's Organization / Account
 */
export function getTenantContracts(user: UserAccount): StoredContractRecord[] {
  try {
    const raw = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const allContracts: StoredContractRecord[] = raw ? JSON.parse(raw) : [];

    // Filter strictly by organization (FR-1.3 tenant boundary)
    const tenantContracts = allContracts.filter(c => c.organization === user.organization);

    if (tenantContracts.length === 0) {
      // Seed initial contracts for this organization if empty
      return initializeTenantSeedContracts(user);
    }

    return tenantContracts;
  } catch {
    return [];
  }
}

/**
 * FR-1.3: Saves/Updates a contract strictly within the user's organization boundary
 */
export function saveTenantContract(
  user: UserAccount,
  contractId: string,
  metadata: DocumentMetadata,
  obligations: ContractObligation[]
): void {
  try {
    const raw = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const allContracts: StoredContractRecord[] = raw ? JSON.parse(raw) : [];

    const existingIdx = allContracts.findIndex(c => c.contractId === contractId && c.organization === user.organization);

    const record: StoredContractRecord = {
      contractId,
      userId: user.userId,
      organization: user.organization,
      fileName: metadata.fileName,
      fileType: metadata.fileName.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
      uploadDate: metadata.uploadedAt || new Date().toISOString(),
      processingStatus: 'VERIFIED',
      metadata,
      obligations
    };

    if (existingIdx >= 0) {
      allContracts[existingIdx] = record;
    } else {
      allContracts.unshift(record);
    }

    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(allContracts));
  } catch (err) {
    console.error('Failed to save tenant contract:', err);
  }
}

/**
 * Seeds initial contracts for a given organization to demonstrate FR-1.3 isolation
 */
function initializeTenantSeedContracts(user: UserAccount): StoredContractRecord[] {
  const isTezpur = user.organization.toLowerCase().includes('tezpur');
  const isTcs = user.organization.toLowerCase().includes('tata') || user.organization.toLowerCase().includes('tcs');

  // Choose appropriate bundle based on organization
  let template = DEMO_CONTRACT_BUNDLES[0];
  if (!isTezpur && isTcs) {
    template = DEMO_CONTRACT_BUNDLES[0];
  } else if (!isTezpur) {
    template = DEMO_CONTRACT_BUNDLES[1];
  }

  const seeded: StoredContractRecord = {
    contractId: `CTR-${user.organization.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-001`,
    userId: user.userId,
    organization: user.organization,
    fileName: template.metadata.fileName,
    fileType: template.metadata.fileName.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
    uploadDate: new Date().toISOString(),
    processingStatus: 'VERIFIED',
    metadata: template.metadata,
    obligations: template.getObligations(getTodayIsoString())
  };

  try {
    const raw = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const allContracts: StoredContractRecord[] = raw ? JSON.parse(raw) : [];
    allContracts.push(seeded);
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(allContracts));
  } catch (err) {
    console.error('Failed to seed tenant contracts', err);
  }

  return [seeded];
}
