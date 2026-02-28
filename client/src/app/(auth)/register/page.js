'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import api from '@/utils/api';
import { User, Mail, Lock, Phone, Building2, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

const STEPS = ['register', 'verify-email', 'verify-phone'];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phoneNumber: '', role: 'tenant' });
  const [emailToken, setEmailToken] = useState('');
  const [phoneOTP, setPhoneOTP] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await axios.post('/api/auth/register', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setStep('verify-email');
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post('/api/auth/verify-email', { email: formData.email, code: emailToken });
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      localStorage.setItem('userInfo', JSON.stringify({ ...stored, isVerified: true }));
      await api.post('/auth/send-otp');
      setStep('verify-phone');
    } catch (err) { setError(err.response?.data?.message || 'Invalid code'); }
    finally { setLoading(false); }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/resend-verification', { email: formData.email });
      setSuccess('Email resent!'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/verify-otp', { code: phoneOTP });
      // Fetch complete fresh user data to ensure role etc. are set
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
      router.push('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try { await api.post('/auth/send-otp'); setSuccess('OTP resent!'); setTimeout(() => setSuccess(''), 3000); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step === s ? 'bg-blue-600' : i < STEPS.indexOf(step) ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${step === 'register' ? 'bg-blue-50' : step === 'verify-email' ? 'bg-indigo-50' : 'bg-green-50'}`}>
              {step === 'register' && <User className="w-8 h-8 text-blue-600" />}
              {step === 'verify-email' && <Mail className="w-8 h-8 text-indigo-600" />}
              {step === 'verify-phone' && <Phone className="w-8 h-8 text-green-600" />}
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
              {step === 'register' ? 'Create Account' : step === 'verify-email' ? 'Verify Email' : 'Verify Phone'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {step === 'register' && 'Join RentifyPro today'}
              {step === 'verify-email' && `Check ${formData.email} for a verification link`}
              {step === 'verify-phone' && `Enter the code sent to ${formData.phoneNumber}`}
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm text-center">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm text-center">{success}</div>}

          {step === 'register' && (
            <form className="space-y-4" onSubmit={handleRegister}>
              {[{ name: 'name', type: 'text', placeholder: 'Full Name', Icon: User }, { name: 'email', type: 'email', placeholder: 'Email Address', Icon: Mail }, { name: 'phoneNumber', type: 'tel', placeholder: 'Phone Number (+923...)', Icon: Phone }, { name: 'password', type: 'password', placeholder: 'Password (min 8 chars)', Icon: Lock }].map(({ name, type, placeholder, Icon }) => (
                <div key={name} className="relative">
                  <Icon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input name={name} type={type} required placeholder={placeholder} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select name="role" onChange={handleChange} value={formData.role}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="tenant">I am a Tenant</option>
                  <option value="landlord">I am a Landlord</option>
                  <option value="property_manager">I am a Property Manager</option>
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-black hover:bg-blue-700 disabled:bg-blue-400 transition">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Account →'}
              </button>
              <p className="text-center text-sm text-gray-500">Already have an account?{' '}<Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link></p>
            </form>
          )}

          {step === 'verify-email' && (
            <div className="space-y-5">
              <div className="bg-indigo-50 rounded-2xl p-4 text-center text-sm text-indigo-700">
                We sent a <strong>6-digit code</strong> to <strong>{formData.email}</strong>. Enter it below to verify your account.
              </div>
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={emailToken}
                  onChange={e => setEmailToken(e.target.value.replace(/\D/g, '').trim())}
                  placeholder="Enter 6-digit code"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.5em] font-black text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={loading || emailToken.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition">
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle className="w-4 h-4" /> Verify Email</>}
                </button>
              </form>
              <button onClick={handleResendEmail} disabled={loading} className="w-full text-sm text-gray-500 hover:text-blue-600">Resend code</button>
            </div>
          )}

          {step === 'verify-phone' && (
            <form onSubmit={handleVerifyPhone} className="space-y-5">
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={phoneOTP}
                onChange={e => setPhoneOTP(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 focus:outline-none focus:border-green-500" />
              <button type="submit" disabled={loading || phoneOTP.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3.5 font-black hover:bg-green-700 disabled:bg-green-400 transition">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="w-4 h-4" /> Verify & Enter Dashboard</>}
              </button>
              <button type="button" onClick={handleResendOTP} disabled={loading} className="w-full text-sm text-gray-500 hover:text-blue-600">Resend OTP</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
