'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import Link from 'next/link';
import { Phone, ArrowLeft, Loader2, CheckCircle, RefreshCw } from 'lucide-react';

export default function VerifyPhonePage() {
  const router = useRouter();
  const [step,     setStep]     = useState('send');  // 'send' | 'verify' | 'done'
  const [code,     setCode]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp');
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length < 4) return setError('Enter the full OTP code');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { code });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/profile" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Verify Phone Number</h1>
          <p className="text-gray-400 text-sm">Secure your account with SMS verification</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {step === 'send' && (
          <div className="text-center space-y-6">
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-xl mb-2">Verify Your Phone</h2>
              <p className="text-gray-500 text-sm">
                We'll send a one-time code to the phone number on your account via Twilio SMS.
              </p>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl py-3.5 font-black hover:bg-green-700 disabled:bg-green-400 transition"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Phone className="w-4 h-4" /> Send OTP Code</>}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="font-black text-gray-900 text-xl mb-2">Enter OTP Code</h2>
              <p className="text-gray-500 text-sm">The 6-digit code was sent to your phone. Check your messages.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-blue-500 transition"
              />
              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Verify Phone'}
              </button>
              <button
                type="button"
                onClick={() => { setCode(''); handleSend(); }}
                className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-blue-600 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend code
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-6 py-4">
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-xl mb-2">Phone Verified!</h2>
              <p className="text-gray-500 text-sm">You'll now receive SMS alerts for rent reminders and important updates.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="w-full bg-green-600 text-white rounded-2xl py-3.5 font-black hover:bg-green-700 transition"
            >
              Back to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
