'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  Users, FileText, Building2, CreditCard, Wrench, TrendingUp,
  CheckCircle, Clock, AlertCircle, BarChart2, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6','#6366f1','#f59e0b','#10b981','#8b5cf6'];

export default function AdminStatsPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats)  return <p className="text-gray-500">Failed to load stats.</p>;

  const { totals, revenue, usersByRole, agreementsByMonth } = stats;

  const monthChartData = agreementsByMonth.map(m => ({
    name: `${m._id.year}-${String(m._id.month).padStart(2,'0')}`,
    count: m.count,
  }));

  const roleChartData = usersByRole.map(r => ({
    name: r._id.replace('_', ' '),
    value: r.count,
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Platform Analytics</h1>
        <p className="text-gray-400 text-sm font-medium mt-1">Real-time platform health &amp; metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users"        value={totals.users}              icon={Users}       color="text-blue-600"   bg="bg-blue-50" />
        <KpiCard label="Total Revenue"      value={`Rs. ${revenue.toLocaleString()}`} icon={TrendingUp}  color="text-green-600"  bg="bg-green-50" />
        <KpiCard label="Active Leases"      value={totals.activeAgreements}   icon={CheckCircle} color="text-indigo-600" bg="bg-indigo-50" />
        <KpiCard label="Pending Agreements" value={totals.pendingAgreements}  icon={Clock}       color="text-amber-600"  bg="bg-amber-50" />
        <KpiCard label="Total Properties"   value={totals.properties}         icon={Building2}   color="text-purple-600" bg="bg-purple-50" />
        <KpiCard label="Total Agreements"   value={totals.agreements}         icon={FileText}    color="text-slate-600"  bg="bg-slate-50" />
        <KpiCard label="Expired Leases"     value={totals.expiredAgreements}  icon={AlertCircle} color="text-red-500"    bg="bg-red-50" />
        <KpiCard label="Open Maintenance"   value={totals.openMaintenanceRequests} icon={Wrench} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agreements by Month */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 uppercase tracking-widest mb-6">
            New Agreements — Last 6 Months
          </h2>
          {monthChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">No data yet</p>
          )}
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 uppercase tracking-widest mb-6">
            Users by Role
          </h2>
          {roleChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                  {roleChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`${bg} ${color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );
}
