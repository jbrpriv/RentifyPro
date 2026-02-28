'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/utils/api';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const strength = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    ? 'strong' : password.length >= 6 ? 'medium' : 'weak';
  const strengthColors = { weak: 'bg-red-400', medium: 'bg-amber-400', strong: 'bg-green-500' };
  const strengthWidth  = { weak: 'w-1/3',      medium: 'w-2/3',        strong: 'w-full' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8)  return setError('Password must be at least 8 characters');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
        <div className="bg-red-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Invalid Link</h1>
        <p className="text-gray-500 text-sm mb-6">This reset link is missing or malformed.</p>
        <Link href="/forgot-password" className="block w-full bg-blue-600 text-white rounded-2xl py-3.5 text-sm font-black hover:bg-blue-700 text-center">
          Request New Link
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">

        {!success ? (
          <>
            <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Set New Password</h1>
            <p className="text-gray-500 text-sm mb-8">Choose a strong password with at least 8 characters, one uppercase letter, and one number.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strengthColors[strength]} ${strengthWidth[strength]}`} />
                    </div>
                    <p className={`text-xs mt-1 capitalize font-semibold ${strength === 'strong' ? 'text-green-600' : strength === 'medium' ? 'text-amber-600' : 'text-red-500'}`}>
                      {strength} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      confirm && confirm !== password ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || (confirm && confirm !== password)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="bg-green-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Password Reset!</h1>
            <p className="text-gray-500 text-sm mb-2">Your password has been updated successfully.</p>
            <p className="text-xs text-gray-400">Redirecting you to login in 3 seconds…</p>
          </div>
        )}
      </div>
    </div>
  );
}
