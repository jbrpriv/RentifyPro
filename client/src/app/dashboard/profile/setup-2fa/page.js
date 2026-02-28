'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Loader2, CheckCircle, QrCode, Smartphone } from 'lucide-react';
import Image from 'next/image';

export default function Setup2FAPage() {
  const router = useRouter();
  const [step,    setStep]    = useState('intro');   // intro | qr | verify | done
  const [qrCode,  setQrCode]  = useState('');
  const [secret,  setSecret]  = useState('');
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('qr');
    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (token.length < 6) return setError('Enter the 6-digit code from your authenticator app');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/2fa/verify', { token });
      // Update localStorage so UI reflects 2FA enabled
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('userInfo', JSON.stringify({ ...u, twoFactorEnabled: true }));
      }
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code — try again');
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Two-Factor Authentication</h1>
          <p className="text-gray-400 text-sm">Extra security for your account</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

        {/* INTRO */}
        {step === 'intro' && (
          <div className="text-center space-y-6">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-black text-xl text-gray-900 mb-2">Enable 2FA</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Use an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong> to generate time-based codes. Even if your password is stolen, your account stays protected.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3">
              {[
                { icon: '📱', text: 'Install Google Authenticator or Authy on your phone' },
                { icon: '📷', text: 'Scan the QR code we give you' },
                { icon: '🔢', text: 'Enter the 6-digit code to confirm setup' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg">{step.icon}</span>
                  <p className="text-sm text-gray-600">{step.text}</p>
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>}
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-2xl py-3.5 font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><QrCode className="w-4 h-4" /> Get QR Code</>}
            </button>
          </div>
        )}

        {/* QR CODE */}
        {step === 'qr' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-black text-xl text-gray-900 mb-2">Scan this QR Code</h2>
              <p className="text-gray-500 text-sm">Open your authenticator app and scan the code below.</p>
            </div>

            {/* QR Code image */}
            <div className="flex justify-center">
              <div className="border-4 border-gray-100 rounded-2xl p-3 inline-block">
                {/* qrCode is a base64 data URL */}
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl" />
              </div>
            </div>

            {/* Manual entry fallback */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Can't scan? Enter manually:</p>
              <p className="text-xs font-mono text-gray-700 break-all select-all bg-white rounded-xl px-3 py-2 border border-gray-200">
                {secret}
              </p>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 transition"
            >
              <Smartphone className="w-4 h-4" /> I've scanned it — continue
            </button>
          </div>
        )}

        {/* VERIFY */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="font-black text-xl text-gray-900 mb-2">Confirm Your Code</h2>
              <p className="text-gray-500 text-sm">Enter the 6-digit code your authenticator app is showing right now.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={token}
                onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-blue-500 transition"
              />
              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || token.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3.5 font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Activate 2FA'}
              </button>
              <button type="button" onClick={() => setStep('qr')} className="w-full text-gray-400 text-sm hover:text-gray-600 transition">
                ← Back to QR code
              </button>
            </form>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="text-center space-y-6 py-4">
            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="font-black text-xl text-gray-900 mb-2">2FA is Active!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Every time you log in, you'll need your authenticator code in addition to your password.
                <br /><br />
                <strong className="text-gray-700">Important:</strong> Save your authenticator backup in a safe place. If you lose access to your app, contact support.
              </p>
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
