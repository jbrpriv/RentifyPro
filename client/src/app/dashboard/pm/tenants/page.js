'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { Users, Loader2, Mail, Phone, Building2, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PMTenantsPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // Get all agreements for properties I manage
    api.get('/agreements')
      .then(({ data }) => setAgreements((data || []).filter(a => a.status === 'active')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  const totalRent = agreements.reduce((s, a) => s + (a.financials?.rentAmount || 0), 0);
  const rentByProp = agreements.reduce((acc, a) => {
    const title = a.property?.title || 'Unknown';
    acc[title] = (acc[title] || 0) + (a.financials?.rentAmount || 0);
    return acc;
  }, {});
  const chartData = Object.entries(rentByProp).map(([name, rent]) => ({ name, rent }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Active Tenants</h1>
        <p className="text-gray-400 text-sm mt-1">{agreements.length} active leases across your properties</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3"><Users className="w-5 h-5 text-blue-600" /></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Tenants</p>
          <p className="text-3xl font-black text-gray-900">{agreements.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="bg-green-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Monthly Income</p>
          <p className="text-2xl font-black text-gray-900">Rs. {totalRent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3"><Building2 className="w-5 h-5 text-indigo-600" /></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Properties Occupied</p>
          <p className="text-3xl font-black text-gray-900">{new Set(agreements.map(a => a.property?._id)).size}</p>
        </div>
      </div>

      {/* Rent by Property Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Rent Income by Property</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`Rs. ${v.toLocaleString()}`, 'Monthly Rent']} />
              <Bar dataKey="rent" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {agreements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No active tenants</p>
          <p className="text-sm text-gray-400 mt-1">Tenants will appear here when agreements become active on your properties</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Tenant</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Property</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Rent</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Lease End</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agreements.map(a => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-black">{a.tenant?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <p className="font-bold text-gray-900">{a.tenant?.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-300" />
                      <span className="text-gray-700 text-xs font-medium">{a.property?.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">Rs. {a.financials?.rentAmount?.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.term?.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {a.tenant?.email && (<a href={`mailto:${a.tenant.email}`} className="text-blue-500 hover:text-blue-700"><Mail className="w-4 h-4" /></a>)}
                      {a.tenant?.phoneNumber && a.tenant?.phoneNumber !== '0000000000' && (<a href={`tel:${a.tenant.phoneNumber}`} className="text-green-500 hover:text-green-700"><Phone className="w-4 h-4" /></a>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
