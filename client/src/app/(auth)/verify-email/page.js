'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import Link from 'next/link';
import { MailCheck, Loader2, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam   = searchParams.get('email') || '';

  const [email,     setEmail]     = useState(emailParam);
  const [code,      setCode]      = useState('');
  const [status,    setStatus]    = useState('idle');
  const [msg,       setMsg]       = useState('');
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !code.trim()) return;
    setStatus('verifying');
    setMsg('');
    try {
      await api.post('/auth/verify-email', { email, code: code.trim() });
      setStatus('success');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Verification failed');
      setStatus('error');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      setMsg('');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">

        {status === 'success' ? (
          <>
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-500 text-sm mb-8">Your account is now active. You can log in.</p>
            <Link href="/login" className="block w-full bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 transition">
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MailCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a <strong>6-digit code</strong> to your email address. Enter it below to activate your account.
            </p>

            {resent && (
              <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-2 mb-4 font-semibold">
                ✓ New code sent! Check your inbox.
              </div>
            )}
            {msg && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2 mb-4">{msg}</div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center tracking-[0.5em] font-black text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'verifying' || code.length < 6}
                className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center justify-center gap-2"
              >
                {status === 'verifying'
                  ? <><Loader2 className="animate-spin w-4 h-4" /> Verifying...</>
                  : <><KeyRound className="w-4 h-4" /> Verify Code</>}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Didn't receive a code?</p>
              <button
                onClick={handleResend}
                disabled={resending || !email}
                className="flex items-center gap-1.5 text-blue-600 text-sm font-bold hover:text-blue-800 mx-auto disabled:text-gray-400"
              >
                {resending ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Resend Code
              </button>
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Link href="/" className="text-xs text-gray-400 hover:text-blue-600">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
