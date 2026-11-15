import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  CheckCircle2, 
  LogOut,
  X,
  FileKey2,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import type { UserAccount, UserRole } from '../types/auth';
import { authenticateUser, registerUser } from '../utils/authService';

interface AuthModalProps {
  currentUser: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (account: UserAccount) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onAuthSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('mihir.csm25008@tezpur.ac.in');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ADMIN_LEGAL_OFFICER');

  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = authenticateUser(loginEmail, loginPassword);
    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regEmail || !regPassword || !regName || !regOrg) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    const res = registerUser({
      name: regName,
      email: regEmail,
      password: regPassword,
      organization: regOrg,
      role: regRole,
    });

    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  // Quick switch demo accounts to demonstrate FR-1.3 tenant data isolation
  const handleSelectQuickAccount = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    const res = authenticateUser(email, pass);
    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                {currentUser ? 'Active JWT Session & Tenant Workspace' : 'User Authentication & Session Management'}
              </h3>
              <p className="text-xs text-blue-200/80">
                FR-1.1, FR-1.2 (JSON Web Token) & FR-1.3 (Tenant Data Isolation)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {currentUser ? (
            /* ACTIVE SESSION VIEW */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-emerald-900 text-sm">Authenticated Session Active</div>
                  <p className="text-emerald-700 mt-1 leading-relaxed">
                    User access token is cryptographically verified. Uploaded contracts and extracted obligation tables are strictly isolated to your organization domain.
                  </p>
                </div>
              </div>

              {/* JWT Token Details Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">User Identity:</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">Email:</span>
                  <span className="text-blue-700">{currentUser.email}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">Organization Tenant (FR-1.3):</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-bold">
                    {currentUser.organization}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">Assigned Role:</span>
                  <span className="text-slate-700 font-semibold">{currentUser.role}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 font-sans font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>JWT Token Expiration:</span>
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {new Date(currentUser.tokenExpiresAt).toLocaleTimeString()} (Active)
                  </span>
                </div>

                {/* Token Raw Snippet */}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider block mb-1">
                    Bearer Token Hash (Header.Payload.Sig):
                  </span>
                  <div className="p-2 bg-slate-100 rounded-lg text-[10px] text-slate-600 break-all select-all font-mono">
                    {currentUser.token}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Continue Working
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out (Invalidate JWT)</span>
                </button>
              </div>
            </div>
          ) : (
            /* LOGIN / REGISTER TABS */
            <div className="space-y-4">
              
              {/* Tab Selector */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In (JWT Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register New Account
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {activeTab === 'login' ? (
                /* LOGIN FORM (FR-1.1 & FR-1.2) */
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="user@tezpur.ac.in"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (bcrypt encrypted)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <FileKey2 className="w-4 h-4" />
                    <span>Authenticate & Issue Token (FR-1.2)</span>
                  </button>

                  {/* Quick-Switch Demo Tenants (Demonstrating FR-1.3 Isolation) */}
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Quick Test: Switch Tenant Workspace (FR-1.3)</span>
                    </span>

                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectQuickAccount('mihir.csm25008@tezpur.ac.in', 'admin123')}
                        className="text-left p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">Mihir Kumar (Tezpur Legal Cell)</div>
                          <div className="text-[10px] text-slate-500">Org: Tezpur University Legal Cell</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectQuickAccount('external.auditor@tcs.com', 'admin123')}
                        className="text-left p-2 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">TCS Auditor (Vendor Tenant)</div>
                          <div className="text-[10px] text-slate-500">Org: Tata Consultancy Services Ltd.</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* REGISTRATION FORM (FR-1.1) */
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Bishwas Das"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organization / Tenant Name (FR-1.3 Isolation Boundary)
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regOrg}
                        onChange={(e) => setRegOrg(e.target.value)}
                        placeholder="e.g. HDFC Bank Corporate Law Division"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Role (RBAC)</label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ADMIN_LEGAL_OFFICER">Legal Officer</option>
                        <option value="DEPARTMENT_MANAGER">Project Manager</option>
                        <option value="ACADEMIC_EVALUATOR">Academic Assessor</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Create Account & Register (FR-1.1)</span>
                  </button>
                </form>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
