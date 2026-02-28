'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Save, Loader2, Bell, MessageSquare, ShieldCheck, ShieldOff, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';

export default function ProfilePage() {
  const [user, setUser]         = useState(null);
  const [dbUser, setDbUser]     = useState(null);
  const [form, setForm]         = useState({ name: '', phoneNumber: '' });
  const [prefs, setPrefs]       = useState({ smsOptIn: false, emailOptIn: true });
  const [saving, setSaving]     = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [msg, setMsg]           = useState('');

  // 2FA state
  const [twoFAEnabled, set2FAEnabled]   = useState(false);
  const [show2FASetup,  setShow2FASetup] = useState(false);
  const [qrCode,        setQrCode]       = useState('');
  const [totpInput,     setTotpInput]    = useState('');
  const [twoFALoading,  set2FALoading]   = useState(false);
  const [showDisable,   setShowDisable]  = useState(false);
  const [disableOTP,    setDisableOTP]   = useState('');
  const [disableVia,    setDisableVia]   = useState(''); // 'phone' | 'email'

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setForm({ name: u.name || '', phoneNumber: u.phoneNumber || '' });
    }
    api.get('/users/me').then(({ data }) => {
      setDbUser(data);
      setPrefs({ smsOptIn: data.smsOptIn || false, emailOptIn: data.emailOptIn !== false });
      set2FAEnabled(data.twoFactorEnabled || false);
      setForm({ name: data.name || '', phoneNumber: data.phoneNumber || '' });
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('userInfo', JSON.stringify({ ...u, ...data }));
        setUser(prev => ({ ...prev, ...data }));
      }
    }).catch(console.error);
  }, []);

  const setMsgTimeout = (text) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', form);
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('userInfo', JSON.stringify({ ...u, name: data.name, phoneNumber: data.phoneNumber }));
      }
      setUser(prev => ({ ...prev, name: data.name, phoneNumber: data.phoneNumber }));
      setMsgTimeout('✅ Profile updated successfully!');
    } catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSavePrefs = async () => {
    setPrefSaving(true);
    try { await api.patch('/users/me/preferences', prefs); setMsgTimeout('✅ Preferences saved!'); }
    catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Failed to save preferences'); }
    finally { setPrefSaving(false); }
  };

  // 2FA: Start setup
  const handle2FASetup = async () => {
    set2FALoading(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setQrCode(data.qrCode);
      setShow2FASetup(true);
    } catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Failed to set up 2FA'); }
    finally { set2FALoading(false); }
  };

  // 2FA: Verify TOTP and enable
  const handle2FAVerify = async (e) => {
    e.preventDefault();
    set2FALoading(true);
    try {
      await api.post('/auth/2fa/verify', { token: totpInput });
      set2FAEnabled(true);
      setShow2FASetup(false);
      setTotpInput('');
      setMsgTimeout('✅ 2FA enabled successfully!');
    } catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Invalid code'); }
    finally { set2FALoading(false); }
  };

  // 2FA: Send OTP for disable
  const handleSend2FADisableOTP = async () => {
    set2FALoading(true);
    try {
      const { data } = await api.post('/auth/2fa/disable/send-otp');
      setDisableVia(data.via);
      setShowDisable(true);
      setMsgTimeout(`📱 OTP sent to your ${data.via}`);
    } catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Failed to send OTP'); }
    finally { set2FALoading(false); }
  };

  // 2FA: Confirm disable
  const handle2FADisable = async (e) => {
    e.preventDefault();
    set2FALoading(true);
    try {
      await api.post('/auth/2fa/disable', { otpCode: disableOTP });
      set2FAEnabled(false);
      setShowDisable(false);
      setDisableOTP('');
      setMsgTimeout('✅ 2FA disabled successfully');
    } catch (err) { setMsgTimeout(err.response?.data?.message || '❌ Invalid OTP'); }
    finally { set2FALoading(false); }
  };

  if (!user) return null;

  const roleColors = {
    admin: 'bg-red-600', landlord: 'bg-indigo-600',
    property_manager: 'bg-amber-500', tenant: 'bg-green-600', law_reviewer: 'bg-purple-600',
  };
  const headerBg = roleColors[user.role] || 'bg-blue-600';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-gray-900 tracking-tighter">My Profile</h1>

      {msg && (
        <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : msg.startsWith('📱') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
          {msg}
        </div>
      )}

      {/* Avatar Header */}
      <div className={`${headerBg} rounded-2xl px-6 py-8 flex items-center space-x-4`}>
        <div className="bg-white/20 rounded-full h-16 w-16 flex items-center justify-center">
          <span className="text-white text-2xl font-black">{user.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{user.name}</h2>
          <span className="inline-block px-2 py-0.5 bg-white/20 text-white text-[10px] font-black rounded-full uppercase tracking-widest capitalize mt-1">
            {user.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Account Details</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+923001234567" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Changing your phone number will require re-verification</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={dbUser?.email || user.email || ''} disabled
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Account Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={(user.role || '').replace('_', ' ')} disabled
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 capitalize" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400 transition">
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: 'emailOptIn', Icon: Mail, label: 'Email Notifications', desc: 'Rent reminders, agreements, receipts', color: 'blue' },
            { key: 'smsOptIn', Icon: MessageSquare, label: 'SMS Notifications', desc: 'Rent due, overdue alerts, OTP codes', color: 'green' },
          ].map(({ key, Icon, label, desc, color }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 bg-${color}-50 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
              <div onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${prefs[key] ? `bg-${color}-600` : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          ))}
        </div>
        <button onClick={handleSavePrefs} disabled={prefSaving}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-black hover:bg-gray-800 disabled:bg-gray-400 transition">
          {prefSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Bell className="w-4 h-4" /> Save Preferences</>}
        </button>
      </div>

      {/* 2FA Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Security</h3>

        {/* 2FA Status + Toggle */}
        <div className={`rounded-2xl p-4 border ${twoFAEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${twoFAEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                {twoFAEnabled ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Two-Factor Authentication</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${twoFAEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <p className="text-xs font-medium text-gray-500">
                    {twoFAEnabled ? '2FA is ACTIVE — your account is protected' : '2FA is INACTIVE — your account is less secure'}
                  </p>
                </div>
              </div>
            </div>
            {!twoFAEnabled ? (
              <button onClick={handle2FASetup} disabled={twoFALoading}
                className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-3 py-2 text-xs font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition">
                {twoFALoading ? <Loader2 className="animate-spin w-3 h-3" /> : <><QrCode className="w-3 h-3" /> Enable 2FA</>}
              </button>
            ) : (
              <button onClick={handleSend2FADisableOTP} disabled={twoFALoading}
                className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-2 text-xs font-black hover:bg-red-100 disabled:opacity-50 transition">
                {twoFALoading ? <Loader2 className="animate-spin w-3 h-3" /> : <><ShieldOff className="w-3 h-3" /> Disable 2FA</>}
              </button>
            )}
          </div>
        </div>

        {/* 2FA Setup: QR Code + TOTP Input */}
        {show2FASetup && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-indigo-900">Scan with your authenticator app (Google Authenticator, Authy, etc.)</p>
            {qrCode && <img src={qrCode} alt="2FA QR Code" className="mx-auto w-48 h-48 rounded-xl" />}
            <form onSubmit={handle2FAVerify} className="space-y-3">
              <input type="text" inputMode="numeric" maxLength={6} required value={totpInput}
                onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code"
                className="w-full text-center text-2xl font-black tracking-[0.4em] border-2 border-indigo-200 rounded-xl py-3 focus:outline-none focus:border-indigo-500" />
              <div className="flex gap-2">
                <button type="submit" disabled={twoFALoading || totpInput.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-indigo-700 disabled:bg-indigo-400 transition">
                  {twoFALoading ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle className="w-4 h-4" /> Confirm & Enable</>}
                </button>
                <button type="button" onClick={() => setShow2FASetup(false)} className="px-4 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* 2FA Disable: OTP Input */}
        {showDisable && (
          <div className="border border-red-200 bg-red-50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm font-bold">Confirm disable via OTP sent to your {disableVia}</p>
            </div>
            <form onSubmit={handle2FADisable} className="space-y-3">
              <input type="text" inputMode="numeric" maxLength={6} required value={disableOTP}
                onChange={e => setDisableOTP(e.target.value.replace(/\D/g, ''))} placeholder="Enter OTP code"
                className="w-full text-center text-2xl font-black tracking-[0.4em] border-2 border-red-200 rounded-xl py-3 focus:outline-none focus:border-red-500" />
              <div className="flex gap-2">
                <button type="submit" disabled={twoFALoading || disableOTP.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-red-700 disabled:bg-red-400 transition">
                  {twoFALoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Confirm Disable'}
                </button>
                <button type="button" onClick={() => { setShowDisable(false); setDisableOTP(''); }} className="px-4 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
