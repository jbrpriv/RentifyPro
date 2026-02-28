'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { User, Phone, Building2, Loader2, CheckCircle } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState('profile'); // profile | verify-phone
  const [formData, setFormData] = useState({ name: '', role: 'tenant', phoneNumber: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Pre-fill name from stored user info
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      const u = JSON.parse(stored);
      setFormData(f => ({ ...f, name: u.name || '' }));
    }
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber || formData.phoneNumber.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Update profile (name, role, phone)
      await api.put('/users/profile', formData);
      // Fetch fresh user data so localStorage has complete info including role
      const { data: freshUser } = await api.get('/users/me');
      localStorage.setItem('userInfo', JSON.stringify({
        _id: freshUser._id,
        name: freshUser.name,
        role: freshUser.role,
        email: freshUser.email,
        phoneNumber: freshUser.phoneNumber,
        isPhoneVerified: freshUser.isPhoneVerified,
        isVerified: freshUser.isVerified,
      }));
      // Send phone OTP
      await api.post('/auth/send-otp');
      setStep('verify-phone');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setSending(true);
    try {
      await api.post('/auth/send-otp');
      setSuccess('OTP resent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { code: otp });
      // Fetch complete fresh user data
      const { data: freshUser } = await api.get('/users/me');
      localStorage.setItem('userInfo', JSON.stringify({
        _id: freshUser._id,
        name: freshUser.name,
        role: freshUser.role,
        email: freshUser.email,
        phoneNumber: freshUser.phoneNumber,
        isPhoneVerified: true,
        isVerified: freshUser.isVerified,
      }));
      router.replace('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {step === 'profile' ? <User className="w-8 h-8 text-blue-600" /> : <Phone className="w-8 h-8 text-green-600" />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
            {step === 'profile' ? 'Complete Your Profile' : 'Verify Phone Number'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {step === 'profile'
              ? "We need a few more details to set up your account"
              : `We sent a 6-digit code to ${formData.phoneNumber}`}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {['profile', 'verify-phone'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step === s ? 'bg-blue-600' : i < ['profile', 'verify-phone'].indexOf(step) ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {step === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Account Type</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <select
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="tenant">I am a Tenant</option>
                  <option value="landlord">I am a Landlord</option>
                  <option value="property_manager">I am a Property Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+923001234567"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">A verification code will be sent to this number</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3.5 font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Continue →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhone} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-center">Enter 6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3.5 font-black hover:bg-green-700 disabled:bg-green-400 transition"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle className="w-4 h-4" /> Verify & Enter Dashboard</>}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={sending}
                className="text-blue-600 text-sm hover:underline font-medium"
              >
                {sending ? 'Sending...' : "Didn't receive it? Resend OTP"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
