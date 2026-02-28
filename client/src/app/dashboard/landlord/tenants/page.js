'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import Link from 'next/link';
import { Users, Loader2, Mail, Phone, Building2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function LandlordTenantsPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('active');

  useEffect(() => {
    api.get('/agreements')
      .then(({ data }) => setAgreements(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? agreements : agreements.filter(a => a.status === filter);

  // Determine days until lease expiry for expiry alerts
  const withExpiry = filtered.map(a => ({
    ...a,
    daysLeft: Math.ceil((new Date(a.term?.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
  }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Tenant Overview</h1>
        <p className="text-gray-400 text-sm mt-1">{filtered.length} leases shown</p>
      </div>

      {/* Expiry Alerts */}
      {withExpiry.filter(a => a.daysLeft <= 30 && a.daysLeft >= 0 && a.status === 'active').map(a => (
        <div key={a._id} className="bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-4 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              Lease expiring in {a.daysLeft} day{a.daysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-700">{a.property?.title} — {a.tenant?.name}</p>
          </div>
          <Link href="/dashboard/agreements" className="text-xs font-black text-amber-800 uppercase tracking-widest hover:underline">
            View
          </Link>
        </div>
      ))}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['active','signed','sent','expired','all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No tenants found</p>
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
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="text-right px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {withExpiry.map(a => {
                const expiringSoon = a.daysLeft <= 30 && a.daysLeft >= 0 && a.status === 'active';
                return (
                  <tr key={a._id} className={`hover:bg-gray-50 transition-colors ${expiringSoon ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{a.tenant?.name}</p>
                      <p className="text-xs text-gray-400">{a.tenant?.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                        <span className="text-xs text-gray-700">{a.property?.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      Rs. {a.financials?.rentAmount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className={`flex items-center gap-1 text-xs ${expiringSoon ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(a.term?.endDate).toLocaleDateString()}
                        {expiringSoon && <span className="ml-1 text-amber-600">({a.daysLeft}d)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        a.status === 'active'  ? 'bg-green-100 text-green-700' :
                        a.status === 'expired' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {a.tenant?.email && (
                          <a href={`mailto:${a.tenant.email}`} className="text-blue-400 hover:text-blue-600">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {a.tenant?.phoneNumber && (
                          <a href={`tel:${a.tenant.phoneNumber}`} className="text-green-400 hover:text-green-600">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
