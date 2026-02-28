'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import Link from 'next/link';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Phone, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData]   = useState({ email: '', password: '' });
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');
  const [showPwd,  setShowPwd]    = useState(false);

  // 2FA flow
  const [needs2FA,  setNeeds2FA]  = useState(false);
  const [userId2FA, setUserId2FA] = useState('');
  const [totp,      setTotp]      = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  // Email verification flow (if unverified on login)
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [emailForVerify,   setEmailForVerify]   = useState('');
  const [emailToken,       setEmailToken]       = useState('');

  // Phone verification flow (if unverified on login)
  const [needsPhoneVerify, setNeedsPhoneVerify] = useState(false);
  const [phoneOTP,         setPhoneOTP]         = useState('');
  const [sending,          setSending]          = useState(false);
  const [success,          setSuccess]          = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', formData);
      if (data.twoFactorEnabled) {
        setUserId2FA(data._id);
        setNeeds2FA(true);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data));
        router.push('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setEmailForVerify(formData.email);
        setNeedsEmailVerify(true);
      } else if (msg === 'PHONE_NOT_VERIFIED') {
        // Token was returned so they can call /auth/send-otp
        const d = err.response?.data;
        localStorage.setItem('token', d.token);
        localStorage.setItem('userInfo', JSON.stringify({ email: formData.email }));
        await api.post('/auth/send-otp');
        setNeedsPhoneVerify(true);
      } else {
        setError(msg || 'Login failed');
      }
    } finally { setLoading(false); }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setTotpLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/2fa/validate', { userId: userId2FA, token: totp });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Invalid 2FA code'); }
    finally { setTotpLoading(false); }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/verify-email', { token: emailToken });
      setSuccess('Email verified! Signing you in...');
      // Re-login
      const { data } = await api.post('/auth/login', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Invalid token'); }
    finally { setLoading(false); }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/verify-otp', { code: phoneOTP });
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      localStorage.setItem('userInfo', JSON.stringify({ ...stored, isPhoneVerified: true }));
      router.push('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setSending(true);
    try { await api.post('/auth/send-otp'); setSuccess('OTP resent!'); setTimeout(() => setSuccess(''), 3000); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  const handleResendEmailVerification = async () => {
    setSending(true);
    try { await api.post('/auth/resend-verification', { email: emailForVerify }); setSuccess('Verification email resent!'); setTimeout(() => setSuccess(''), 3000); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">RentifyPro</h2>
          <p className="text-gray-400 text-sm mt-1">Sign in to manage your agreements</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6 text-center">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-2xl text-sm mb-6 text-center flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

        {/* Normal Login */}
        {!needs2FA && !needsEmailVerify && !needsPhoneVerify && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500">Password</label>
                  <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 disabled:bg-blue-400 transition">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sign In'}
              </button>
            </form>
            <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400 font-medium">OR</span><div className="flex-1 h-px bg-gray-100" /></div>
            <a href="/api/auth/google"
              className="flex items-center justify-center gap-3 w-full border-2 border-gray-200 rounded-2xl py-3 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}<Link href="/register" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
            </p>
            <p className="text-center text-xs text-gray-400 mt-2">
              Staff?{' '}<Link href="/super-login" className="text-purple-600 font-semibold hover:underline">Admin / Law Reviewer Portal →</Link>
            </p>
          </>
        )}

        {/* 2FA */}
        {needs2FA && (
          <form onSubmit={handle2FASubmit} className="space-y-6">
            <div className="text-center">
              <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="font-black text-gray-900 text-xl mb-1">Two-Factor Auth</h3>
              <p className="text-gray-500 text-sm">Enter the 6-digit code from your authenticator app.</p>
            </div>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
              className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-blue-500 transition" />
            <button type="submit" disabled={totpLoading || totp.length < 6}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-2xl py-3.5 font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition">
              {totpLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Verify & Sign In'}
            </button>
            <button type="button" onClick={() => { setNeeds2FA(false); setError(''); }} className="w-full text-gray-400 text-sm hover:text-gray-600">← Back to login</button>
          </form>
        )}

        {/* Email Verification Prompt */}
        {needsEmailVerify && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="font-black text-gray-900 text-xl mb-1">Verify Your Email</h3>
              <p className="text-gray-500 text-sm">Your email address is not yet verified. Check your inbox and paste the token below.</p>
            </div>
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <input type="text" required value={emailToken} onChange={e => setEmailToken(e.target.value.trim())} placeholder="Paste verification token"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={loading || !emailToken}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle className="w-4 h-4" /> Verify Email</>}
              </button>
            </form>
            <button onClick={handleResendEmailVerification} disabled={sending} className="w-full text-sm text-gray-500 hover:text-blue-600">
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
            <button onClick={() => { setNeedsEmailVerify(false); setError(''); }} className="w-full text-gray-400 text-sm hover:text-gray-600">← Back to login</button>
          </div>
        )}

        {/* Phone Verification Prompt */}
        {needsPhoneVerify && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="bg-green-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-black text-gray-900 text-xl mb-1">Verify Phone Number</h3>
              <p className="text-gray-500 text-sm">A verification code has been sent to your phone number.</p>
            </div>
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={phoneOTP}
                onChange={e => setPhoneOTP(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-green-500" />
              <button type="submit" disabled={loading || phoneOTP.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 font-black hover:bg-green-700 disabled:bg-green-400 transition">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle className="w-4 h-4" /> Verify & Sign In</>}
              </button>
            </form>
            <button onClick={handleResendOTP} disabled={sending} className="w-full text-sm text-gray-500 hover:text-blue-600">
              {sending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
