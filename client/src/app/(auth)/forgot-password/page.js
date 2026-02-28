'use client';

import { useState } from 'react';
import api from '@/utils/api';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">

        <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-600 text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        {!sent ? (
          <>
            <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Forgot Password?</h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your email and we'll send you a secure reset link. It expires in 1 hour.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-4 h-4" /> Send Reset Link</>}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="bg-green-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Check your inbox</h1>
            <p className="text-gray-500 text-sm mb-8">
              If <strong>{email}</strong> exists in our system, a reset link is on its way. Check spam if you don't see it.
            </p>
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white rounded-2xl py-3.5 text-sm font-black hover:bg-blue-700 transition text-center"
            >
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
