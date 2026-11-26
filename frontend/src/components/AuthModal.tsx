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
      setErrorMessage(res.error || 'Authentication failed. Check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regEmail || !regPassword || !regName || !regOrg) {
      setErrorMessage('Complete all required fields.');
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
      setErrorMessage('Enter your registered email address or phone number.');
      return;
    }

    setIsSubmitting(true);
    const res = await requestPasswordResetOtp(forgotIdentifier);
    setIsSubmitting(false);

    if (res.success) {
      setForgotStep('verify');
      setOtpInfoMessage(res.message || `OTP sent to ${res.maskedTarget || forgotIdentifier}`);
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
      setErrorMessage('Enter the 6-digit OTP.');
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
      setSuccessMessage(res.message || 'OTP verified. Enter your new password.');
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
      setErrorMessage('Passwords do not match.');
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
      setSuccessMessage(res.message || 'Password updated. Sign in with your new credentials.');
    } else {
      setErrorMessage(res.error || 'Could not reset password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#19191b] rounded-2xl border border-white/[0.1] shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#232325] border border-white/[0.08] flex items-center justify-center text-[#ededed]">
              <ShieldCheck className="w-4.5 h-4.5 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-[#ededed]">
                {currentUser ? 'Account session' : 'Account access'}
              </h3>
              <p className="text-[12px] text-[#71717a]">
                {currentUser ? 'Active authenticated workspace' : 'Sign in or register a workspace account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentUser ? (
            <div className="space-y-4">
              <div className="border border-white/[0.08] rounded-xl p-4 bg-[#141415] space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[#71717a]">Name</span>
                  <span className="font-medium text-[#ededed]">{currentUser.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[#71717a]">Email</span>
                  <span className="font-mono text-[#a1a1a6]">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[#71717a]">Organization</span>
                  <span className="text-[#ededed] font-medium">{currentUser.organization}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[#71717a]">Role</span>
                  <span className="text-[#a1a1a6] font-mono">{currentUser.role}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[#71717a] inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#4cc38a] stroke-[1.5]" />
                    Session expires
                  </span>
                  <span className="text-[#4cc38a] font-mono tabular-nums">
                    {new Date(currentUser.tokenExpiresAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 h-9 text-[13px] font-medium text-[#ededed] bg-[#232325] hover:bg-[#2c2c30] border border-white/[0.08] rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 h-9 text-[13px] font-medium text-[#e5484d] bg-[#e5484d]/10 hover:bg-[#e5484d]/20 border border-[#e5484d]/25 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab !== 'forgot' && (
                <div className="flex items-center p-1 bg-[#141415] rounded-lg border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                      activeTab === 'login'
                        ? 'bg-[#232325] text-[#ededed] raised-highlight'
                        : 'text-[#71717a] hover:text-[#ededed]'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                      activeTab === 'register'
                        ? 'bg-[#232325] text-[#ededed] raised-highlight'
                        : 'text-[#71717a] hover:text-[#ededed]'
                    }`}
                  >
                    Create account
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] text-[12px] rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-[#4cc38a]/10 border border-[#4cc38a]/30 text-[#4cc38a] text-[12px] rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
                  <span>{successMessage}</span>
                </div>
              )}

              {activeTab === 'login' ? (
                <form onSubmit={handleLoginSubmit} autoComplete="on" className="space-y-3.5">
                  <div>
                    <label htmlFor="login-email" className="block text-[12px] font-medium text-[#a1a1a6] mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@organization.com"
                        className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="login-password" className="block text-[12px] font-medium text-[#a1a1a6]">
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
                        className="text-[12px] text-[#a1a1a6] hover:text-[#ededed] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full text-[13px] pl-9 pr-9 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4 stroke-[1.5]" />
                        ) : (
                          <Eye className="w-4 h-4 stroke-[1.5]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 px-4 bg-[#ededed] hover:bg-white disabled:opacity-50 text-[#0f0f10] font-medium text-[13px] rounded-lg transition-colors cursor-pointer mt-2"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              ) : activeTab === 'register' ? (
                <form onSubmit={handleRegisterSubmit} autoComplete="on" className="space-y-3">
                  <div>
                    <label htmlFor="reg-name" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input
                        id="reg-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Your name"
                        className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-email" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@org.com"
                          className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
                        Phone <span className="text-[#71717a] font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                        <input
                          id="reg-phone"
                          name="tel"
                          type="tel"
                          autoComplete="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-org" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
                      Organization
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                      <input
                        id="reg-org"
                        name="organization"
                        type="text"
                        autoComplete="organization"
                        value={regOrg}
                        onChange={(e) => setRegOrg(e.target.value)}
                        placeholder="Legal or company name"
                        className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-password" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
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
                          className="w-full text-[13px] pl-3 pr-9 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-4 h-4 stroke-[1.5]" />
                          ) : (
                            <Eye className="w-4 h-4 stroke-[1.5]" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-role" className="block text-[12px] font-medium text-[#a1a1a6] mb-1">
                        Role
                      </label>
                      <select
                        id="reg-role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="w-full text-[13px] px-2.5 h-9 bg-[#141415] text-[#ededed] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                      >
                        <option value="ADMIN_LEGAL_OFFICER">Legal Officer</option>
                        <option value="DEPARTMENT_MANAGER">Project Manager</option>
                        <option value="ACADEMIC_EVALUATOR">Assessor</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-9 px-4 bg-[#ededed] hover:bg-white disabled:opacity-50 text-[#0f0f10] font-medium text-[13px] rounded-lg transition-colors cursor-pointer mt-2"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              ) : (
                /* 3-Step OTP Password Recovery */
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
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#a1a1a6] hover:text-[#ededed] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Back to sign in</span>
                    </button>
                    <span className="text-[11px] font-mono text-[#71717a]">
                      Password recovery
                    </span>
                  </div>

                  {forgotStep === 'request' ? (
                    <form onSubmit={handleRequestOtp} className="space-y-3.5">
                      <p className="text-[12px] text-[#a1a1a6] leading-relaxed">
                        Enter your registered email address or phone number to receive a 6-digit verification OTP.
                      </p>

                      <div>
                        <label htmlFor="forgot-identifier" className="block text-[12px] font-medium text-[#a1a1a6] mb-1.5">
                          Email or phone number
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                          <input
                            id="forgot-identifier"
                            type="text"
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(e.target.value)}
                            placeholder="name@organization.com or +919876543210"
                            className="w-full text-[13px] pl-9 pr-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-9 px-4 bg-[#ededed] hover:bg-white disabled:opacity-50 text-[#0f0f10] font-medium text-[13px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>{isSubmitting ? 'Sending OTP...' : 'Send OTP'}</span>
                      </button>
                    </form>
                  ) : forgotStep === 'verify' ? (
                    <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                      {otpInfoMessage && (
                        <div className="p-3 bg-[#141415] border border-white/[0.08] text-[#ededed] text-[12px] rounded-lg space-y-1.5">
                          <div>{otpInfoMessage}</div>
                          {devOtpHint && (
                            <div className="text-[11px] font-mono text-[#a1a1a6]">
                              Verification code: <strong className="text-[#ededed]">{devOtpHint}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="forgot-otp" className="block text-[12px] font-medium text-[#a1a1a6]">
                            6-digit OTP
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotStep('request');
                              setErrorMessage('');
                              setSuccessMessage('');
                            }}
                            className="text-[11px] text-[#a1a1a6] hover:text-[#ededed] hover:underline cursor-pointer"
                          >
                            Change email or phone
                          </button>
                        </div>
                        <input
                          id="forgot-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value)}
                          placeholder="000000"
                          className="w-full text-[13px] font-mono tracking-widest px-3 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30 tabular-nums"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-9 px-4 bg-[#ededed] hover:bg-white disabled:opacity-50 text-[#0f0f10] font-medium text-[13px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[1.5]" />
                        <span>{isSubmitting ? 'Verifying...' : 'Verify OTP'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                      <div>
                        <label htmlFor="forgot-new-password" className="block text-[12px] font-medium text-[#a1a1a6] mb-1.5">
                          New password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                          <input
                            id="forgot-new-password"
                            type={showForgotPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full text-[13px] pl-9 pr-9 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                            aria-label={showForgotPassword ? 'Hide password' : 'Show password'}
                          >
                            {showForgotPassword ? (
                              <EyeOff className="w-4 h-4 stroke-[1.5]" />
                            ) : (
                              <Eye className="w-4 h-4 stroke-[1.5]" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="forgot-confirm-password" className="block text-[12px] font-medium text-[#a1a1a6] mb-1.5">
                          Confirm password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                          <input
                            id="forgot-confirm-password"
                            type={showForgotConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={forgotConfirmPassword}
                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full text-[13px] pl-9 pr-9 h-9 bg-[#141415] text-[#ededed] placeholder-[#52525b] border border-white/[0.08] rounded-lg focus:outline-none focus:border-white/30"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                            aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showForgotConfirmPassword ? (
                              <EyeOff className="w-4 h-4 stroke-[1.5]" />
                            ) : (
                              <Eye className="w-4 h-4 stroke-[1.5]" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-9 px-4 bg-[#ededed] hover:bg-white disabled:opacity-50 text-[#0f0f10] font-medium text-[13px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 stroke-[1.5]" />
                        <span>{isSubmitting ? 'Updating...' : 'Reset password'}</span>
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
