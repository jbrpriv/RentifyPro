'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { 
  Plus, FileCheck, Clock, CheckCircle, Building2, 
  PenLine, CreditCard, User, ArrowRight, History, 
  Users, LayoutDashboard, ListPlus, TrendingUp, Key, Wrench, Bell
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];

export default function DashboardHome() {
  const [user, setUser]         = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [pendingMaintenance, setPendingMaintenance] = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setUser(JSON.parse(stored));

    const fetchAll = async () => {
      try {
        const [agResp] = await Promise.all([api.get('/agreements')]);
        setAgreements(agResp.data || []);

        // Fetch role-specific data
        const u = stored ? JSON.parse(stored) : null;
        if (u?.role === 'landlord' || u?.role === 'property_manager' || u?.role === 'admin') {
          const [propResp, appResp] = await Promise.all([
            api.get('/properties').catch(() => ({ data: [] })),
            api.get('/applications').catch(() => ({ data: [] })),
          ]);
          setProperties(Array.isArray(propResp.data) ? propResp.data : []);
          const appData = appResp.data;
          setApplications(Array.isArray(appData) ? appData : []);
        }
        const payResp = await api.get('/payments').catch(() => ({ data: [] }));
        setPayments(payResp.data || []);

        // Pending disputes (open/under_review)
        const dispResp = await api.get('/disputes').catch(() => ({ data: { disputes: [] } }));
        const disputes = dispResp.data?.disputes || [];
        setPendingDisputes(disputes.filter(d => ['open','under_review'].includes(d.status)).length);

        // Pending maintenance
        const maintResp = await api.get('/maintenance').catch(() => ({ data: [] }));
        const maint = Array.isArray(maintResp.data) ? maintResp.data : [];
        setPendingMaintenance(maint.filter(m => ['pending','in_progress'].includes(m.status)).length);

      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (!user || loading) return null;

  const activeLeases = Array.isArray(agreements) ? agreements.filter(a => a.status === 'active') : [];
  const pendingApps  = Array.isArray(applications) ? applications.filter(a => a.status === 'pending') : [];
  const signaturePending = Array.isArray(agreements) ? agreements.filter(a =>
    (a.status === 'sent' && !a.signatures?.landlord?.signed) ||
    (a.status === 'signed' && !a.isPaid)
  ) : [];

  const pendingTasks = user.role === 'landlord'
    ? pendingApps.length + signaturePending.length + pendingDisputes + pendingMaintenance
    : user.role === 'admin'
    ? pendingDisputes + pendingMaintenance
    : signaturePending.length + pendingDisputes + pendingMaintenance;

  const totalRevenue = activeLeases.reduce((acc, curr) => acc + (curr.financials?.rentAmount || 0), 0);

  // Chart data
  const monthlyData = buildMonthlyData(payments);
  const statusData = buildStatusData(agreements);
  const propStatusData = buildPropStatusData(properties);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Hey, {user.name?.split(' ')[0]}!</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            {user.role === 'landlord' ? 'Landlord Management Suite' 
             : user.role === 'property_manager' ? 'Property Manager Portal'
             : user.role === 'admin' ? 'Admin Dashboard'
             : 'Tenant Rental Portal'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm">
          <div className={`w-2 h-2 rounded-full animate-pulse ${user.role === 'landlord' ? 'bg-indigo-500' : user.role === 'admin' ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{user.role?.replace('_', ' ')} Session</span>
        </div>
      </div>

      {/* ALERTS */}
      {pendingTasks > 0 && (
        <div className="bg-orange-50 border-l-8 border-orange-500 rounded-3xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-2xl mr-4"><Bell className="text-orange-600 w-6 h-6" /></div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-none mb-1">
                {pendingTasks} Pending Task{pendingTasks > 1 ? 's' : ''} Require Attention
              </p>
              <p className="text-xs text-orange-800 font-medium">
                {pendingApps.length > 0 && `${pendingApps.length} application(s) to review`}
                {pendingApps.length > 0 && signaturePending.length > 0 && ' · '}
                {signaturePending.length > 0 && `${signaturePending.length} agreement(s) awaiting signature/payment`}
                {(pendingApps.length > 0 || signaturePending.length > 0) && pendingDisputes > 0 && ' · '}
                {pendingDisputes > 0 && `${pendingDisputes} open dispute(s)`}
                {((pendingApps.length + signaturePending.length + pendingDisputes) > 0) && pendingMaintenance > 0 && ' · '}
                {pendingMaintenance > 0 && `${pendingMaintenance} maintenance request(s) pending`}
              </p>
            </div>
          </div>
          <Link href={user.role === 'landlord' ? '/dashboard/applications' : '/dashboard/agreements'}
            className="bg-orange-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-700 transition-all whitespace-nowrap">
            Review Now
          </Link>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === 'landlord' ? (
          <>
            <StatCard label="Monthly Income" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="text-green-600" bg="bg-green-100" />
            <StatCard label="Active Tenants" value={activeLeases.length} icon={CheckCircle} color="text-blue-600" bg="bg-blue-100" />
            <StatCard label="Properties" value={properties.length} icon={Building2} color="text-purple-600" bg="bg-purple-100" />
            <StatCard label="Pending Tasks" value={pendingTasks} icon={Clock} color={pendingTasks > 0 ? "text-orange-600" : "text-gray-600"} bg={pendingTasks > 0 ? "bg-orange-100" : "bg-gray-100"} />
          </>
        ) : user.role === 'property_manager' ? (
          <>
            <StatCard label="Assigned Properties" value={properties.length} icon={Building2} color="text-amber-600" bg="bg-amber-100" />
            <StatCard label="Active Tenants" value={activeLeases.length} icon={Users} color="text-blue-600" bg="bg-blue-100" />
            <StatCard label="Pending Tasks" value={pendingTasks} icon={Clock} color={pendingTasks > 0 ? "text-orange-600" : "text-gray-600"} bg={pendingTasks > 0 ? "bg-orange-100" : "bg-gray-100"} />
            <StatCard label="Open Agreements" value={agreements.filter(a => a.status === 'sent').length} icon={FileCheck} color="text-indigo-600" bg="bg-indigo-100" />
          </>
        ) : (
          <>
            <StatCard label="Monthly Rent" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={CreditCard} color="text-blue-600" bg="bg-blue-100" />
            <StatCard label="Active Leases" value={activeLeases.length} icon={CheckCircle} color="text-green-600" bg="bg-green-100" />
            <StatCard label="Payments Made" value={payments.filter(p => p.status === 'paid').length} icon={TrendingUp} color="text-purple-600" bg="bg-purple-100" />
            <StatCard label="Pending" value={signaturePending.length} icon={Clock} color={signaturePending.length > 0 ? "text-orange-600" : "text-gray-600"} bg={signaturePending.length > 0 ? "bg-orange-100" : "bg-gray-100"} />
          </>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payments Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Monthly Payment Activity</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`Rs. ${v.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-300 text-sm font-bold">No payment data yet</div>
          )}
        </div>

        {/* Agreement Status Pie */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Agreement Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-300 text-sm font-bold">No agreements yet</div>
          )}
        </div>
      </div>

      {/* Property Status Chart (Landlord / PM only) */}
      {(user.role === 'landlord' || user.role === 'property_manager') && propStatusData.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Property Status Overview</h3>
          <div className="flex gap-4">
            {propStatusData.map((d, i) => (
              <div key={d.name} className="flex-1 rounded-2xl p-4 text-center" style={{ backgroundColor: PIE_COLORS[i] + '18', border: `1.5px solid ${PIE_COLORS[i]}33` }}>
                <p className="text-3xl font-black" style={{ color: PIE_COLORS[i] }}>{d.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Occupancy */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Active Occupancy</h3>
          {user.role === 'landlord' && (
            <Link href="/dashboard/properties/new"
              className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-xs font-black hover:bg-blue-700 transition">
              <Plus className="w-3 h-3" /> Add Property
            </Link>
          )}
        </div>
        {activeLeases.length > 0 ? (
          <div className="space-y-4">
            {activeLeases.map(lease => (
              <div key={lease._id} className="p-6 bg-[#fcfcfd] border border-gray-100 rounded-3xl flex items-center justify-between group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm"><Building2 className="text-blue-600 w-6 h-6" /></div>
                  <div>
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest">{lease.property?.type || 'Property'}</p>
                    <h4 className="font-bold text-gray-900">{lease.property?.title || 'Property'}</h4>
                    {user.role !== 'tenant' && lease.tenant && (
                      <p className="text-xs text-gray-400">Tenant: {lease.tenant?.name || 'N/A'}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 tracking-tighter">Rs. {(lease.financials?.rentAmount || 0).toLocaleString()}</p>
                  <span className="text-[10px] font-black text-green-600 uppercase">Active Lease</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-black uppercase text-[10px] tracking-widest">No active leases found.</div>
        )}
      </div>
    </div>
  );
}

function buildMonthlyData(payments) {
  const map = {};
  payments.filter(p => p.status === 'paid').forEach(p => {
    const d = new Date(p.paidAt || p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + (p.amount || 0);
  });
  return Object.entries(map).sort().slice(-6).map(([month, amount]) => ({ month, amount }));
}

function buildStatusData(agreements) {
  const map = {};
  agreements.forEach(a => { map[a.status] = (map[a.status] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildPropStatusData(properties) {
  const map = {};
  properties.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className={`${bg} ${color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}><Icon className="w-6 h-6" /></div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tighter">{value}</p>
    </div>
  );
}
