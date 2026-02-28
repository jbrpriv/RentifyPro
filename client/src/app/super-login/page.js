'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, Scale, UserPlus, LogIn } from 'lucide-react';

const ROLE_CONFIG = {
  admin: {
    label: 'System Administrator',
    icon: ShieldCheck,
    color: 'from-red-600 to-red-700',
    accent: 'red',
    badge: 'ADMIN PORTAL',
    description: 'Full platform management & oversight',
  },
  law_reviewer: {
    label: 'Law Reviewer',
    icon: Scale,
    color: 'from-purple-600 to-purple-700',
    accent: 'purple',
    badge: 'LEGAL PORTAL',
    description: 'Clause review, template management & legal oversight',
  },
};

export default function SuperLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [mode, setMode] = useState('login'); // login | register
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'admin', phoneNumber: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const cfg = ROLE_CONFIG[selectedRole];
  const Icon = cfg.icon;

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFormData(f => ({ ...f, role }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        const payload = { ...formData, role: selectedRole, phoneNumber: formData.phoneNumber || '0000000000' };
        const { data } = await api.post('/auth/register', payload);
        localStorage.setItem('token', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data));
        router.push('/dashboard');
      } else {
        const { data } = await api.post('/auth/login', { email: formData.email, password: formData.password });
        if (!['admin', 'law_reviewer'].includes(data.role)) {
          setError('Access denied. This portal is for admins and law reviewers only.');
          return;
        }
        if (data.twoFactorEnabled) {
          // Handle 2FA if needed
          localStorage.setItem('pending2FA', data._id);
          router.push('/dashboard');
          return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data));
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Restricted Access</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">RentifyPro</h1>
          <p className="text-white/40 text-sm mt-1">Internal Staff Portal</p>
        </div>

        {/* Role Selector */}
        <div className="flex gap-2 mb-6">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const RIcon = config.icon;
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-gray-900 border-white'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <RIcon className="w-4 h-4" />
                {config.label.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8">

          {/* Role Badge */}
          <div className={`bg-gradient-to-r ${cfg.color} rounded-2xl px-4 py-3 flex items-center gap-3 mb-6`}>
            <div className="bg-white/20 p-2 rounded-xl">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">{cfg.badge}</p>
              <p className="text-white font-bold text-sm">{cfg.description}</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === m ? 'bg-white text-gray-900' : 'text-white/50 hover:text-white'
                }`}
              >
                {m === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={e => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+923001234567"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-white/30"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-3.5 text-white/30 hover:text-white/60">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${cfg.color} text-white rounded-xl py-3.5 font-black text-sm hover:opacity-90 disabled:opacity-50 transition mt-2`}
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (mode === 'login' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>)}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          This portal is restricted to authorized staff only.
          <br />Regular users should use the{' '}
          <a href="/login" className="text-white/40 hover:text-white underline">standard login</a>.
        </p>
      </div>
    </div>
  );
}
