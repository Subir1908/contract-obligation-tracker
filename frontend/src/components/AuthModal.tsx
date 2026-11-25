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
  Clock,
  Eye,
  EyeOff,
  Phone,
  ArrowLeft,
  Send
} from 'lucide-react';
import type { UserAccount, UserRole } from '../types/auth';
import {
  loginWithBackend,
  registerWithBackend,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login fields (empty by default so browser / Google Password Manager autofill works naturally)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ADMIN_LEGAL_OFFICER');

  // Forgot password / OTP fields
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [otpInfoMessage, setOtpInfoMessage] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const res = await loginWithBackend(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regEmail || !regPassword || !regName || !regOrg) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    const res = await registerWithBackend({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      organization: regOrg,
      role: regRole,
    });
    setIsSubmitting(false);

    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevOtpHint('');

    if (!forgotIdentifier.trim()) {
      setErrorMessage('Please enter your registered email address or phone number.');
      return;
    }

    setIsSubmitting(true);
    const res = await requestPasswordResetOtp(forgotIdentifier);
    setIsSubmitting(false);

    if (res.success) {
      setForgotStep('verify');
      setOtpInfoMessage(res.message || `OTP sent to ${res.maskedTarget || forgotIdentifier}.`);
      if (res.demoOtp) {
        setDevOtpHint(res.demoOtp);
      }
    } else {
      setErrorMessage(res.error || 'Could not send OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!forgotOtp.trim()) {
      setErrorMessage('Please enter the 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyPasswordResetOtp({
      identifier: forgotIdentifier,
      otp: forgotOtp,
    });
    setIsSubmitting(false);

    if (res.success) {
      setForgotStep('reset');
      setSuccessMessage(res.message || 'OTP verified! Please enter your new password.');
    } else {
      setErrorMessage(res.error || 'Invalid or expired OTP.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPasswordWithOtp({
      identifier: forgotIdentifier,
      otp: forgotOtp,
      newPassword: forgotNewPassword,
    });
    setIsSubmitting(false);

    if (res.success) {
      if (forgotIdentifier.includes('@')) {
        setLoginEmail(forgotIdentifier.trim());
      }
      setLoginPassword('');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep('request');
      setDevOtpHint('');
      setOtpInfoMessage('');
      setActiveTab('login');
      setSuccessMessage(res.message || 'Password reset successful. Please sign in.');
    } else {
      setErrorMessage(res.error || 'Could not reset password.');
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
                {currentUser ? 'Active Session & Workspace' : 'User Authentication & Session Management'}
              </h3>
              <p className="text-xs text-blue-200/80">
                Secure Workspace Authentication
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

              {/* Session Details Card */}
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
                  <span className="text-slate-500 font-sans font-semibold">Organization:</span>
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
                    <span>Session Expiration:</span>
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
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* LOGIN / REGISTER / FORGOT PASSWORD */
            <div className="space-y-4">

              {activeTab !== 'forgot' && (
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'login'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage('');
                      setSuccessMessage('');
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
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {activeTab === 'login' ? (
                /* LOGIN FORM (Supports Chrome / Google Password Manager Autofill) */
                <form onSubmit={handleLoginSubmit} autoComplete="on" className="space-y-3.5">
                  <div>
                    <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot');
                          setForgotStep('request');
                          setForgotIdentifier(loginEmail);
                          setErrorMessage('');
                          setSuccessMessage('');
                          setOtpInfoMessage('');
                          setDevOtpHint('');
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full text-xs pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <FileKey2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                  </button>
                </form>
              ) : activeTab === 'register' ? (
                /* REGISTRATION FORM */
                <form onSubmit={handleRegisterSubmit} autoComplete="on" className="space-y-3">
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Bishwas Das"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@organization.com"
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number <span className="text-slate-400 font-normal">(for OTP)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-phone"
                          name="tel"
                          type="tel"
                          autoComplete="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-org" className="block text-xs font-semibold text-slate-700 mb-1">
                      Organization / Workspace Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-org"
                        name="organization"
                        type="text"
                        autoComplete="organization"
                        value={regOrg}
                        onChange={(e) => setRegOrg(e.target.value)}
                        placeholder="e.g. HDFC Bank Corporate Law Division"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          name="new-password"
                          type={showRegPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create password"
                          className="w-full text-xs pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                          title={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-role" className="block text-xs font-semibold text-slate-700 mb-1">
                        Role
                      </label>
                      <select
                        id="reg-role"
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
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSubmitting ? 'Creating Account...' : 'Create Account & Register'}</span>
                  </button>
                </form>
              ) : (
                /* FORGOT PASSWORD WITH EMAIL / PHONE OTP */
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setForgotStep('request');
                        setErrorMessage('');
                        setOtpInfoMessage('');
                        setDevOtpHint('');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      OTP Password Recovery
                    </span>
                  </div>

                  {forgotStep === 'request' ? (
                    <form onSubmit={handleRequestOtp} className="space-y-3.5">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Enter your registered <strong>email address</strong> or <strong>phone number</strong>. We will send a 6-digit One-Time Password (OTP) to verify your identity.
                      </p>

                      <div>
                        <label htmlFor="forgot-identifier" className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address or Phone Number
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="forgot-identifier"
                            type="text"
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(e.target.value)}
                            placeholder="e.g. name@organization.com or +919876543210"
                            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Sending OTP...' : 'Send OTP'}</span>
                      </button>
                    </form>
                  ) : forgotStep === 'verify' ? (
                    <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                      {otpInfoMessage && (
                        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl space-y-1">
                          <div className="font-semibold">{otpInfoMessage}</div>
                          {devOtpHint && (
                            <div className="text-[11px] font-mono bg-white/80 px-2 py-1 rounded border border-blue-200 inline-block">
                              OTP Code: <strong>{devOtpHint}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="forgot-otp" className="block text-xs font-semibold text-slate-700">
                            Enter 6-Digit OTP
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotStep('request');
                              setErrorMessage('');
                              setSuccessMessage('');
                            }}
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                          >
                            Change Email / Phone
                          </button>
                        </div>
                        <input
                          id="forgot-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          className="w-full text-xs font-mono tracking-widest px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Verifying OTP...' : 'Verify OTP'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                      <div>
                        <label htmlFor="forgot-new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="forgot-new-password"
                            type={showForgotPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full text-xs pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            aria-label={showForgotPassword ? 'Hide password' : 'Show password'}
                            title={showForgotPassword ? 'Hide password' : 'Show password'}
                          >
                            {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="forgot-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="forgot-confirm-password"
                            type={showForgotConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={forgotConfirmPassword}
                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full text-xs pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                            title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{isSubmitting ? 'Updating Password...' : 'Reset Password'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
