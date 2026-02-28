'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  Building2, Search, Loader2, UserMinus, CheckCircle,
  AlertCircle, Clock, MapPin, User, X,
} from 'lucide-react';

const STATUS_STYLES = {
  available:  { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Available' },
  occupied:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Occupied' },
  maintenance:{ bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Maintenance' },
  inactive:   { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Inactive' },
};

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [kicking, setKicking]       = useState(null);
  const [kickReason, setKickReason] = useState('');
  const [confirmProp, setConfirmProp] = useState(null);
  const [msg, setMsg]               = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/properties');
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleKickTenant = async () => {
    if (!confirmProp) return;
    setKicking(confirmProp._id);
    try {
      const { data } = await api.post(`/admin/properties/${confirmProp._id}/kick-tenant`, { reason: kickReason });
      setMsg({ type: 'success', text: data.message });
      setConfirmProp(null);
      setKickReason('');
      fetchProperties();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to remove tenant' });
    } finally {
      setKicking(null);
    }
  };

  const filtered = properties.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.landlord?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.activeAgreement?.tenant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const occupied = properties.filter(p => p.activeAgreement).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Property Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all platform properties and tenants</p>
        </div>
        <div className="flex gap-3">
          <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
            {properties.length} total
          </span>
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            {occupied} occupied
          </span>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-semibold">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by property, landlord or tenant name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Confirm Kick Modal */}
      {confirmProp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-black text-gray-900">Remove Tenant</h3>
            <p className="text-sm text-gray-600">
              You are about to remove <strong>{confirmProp.activeAgreement?.tenant?.name}</strong> from{' '}
              <strong>{confirmProp.title}</strong>. This will terminate their lease agreement.
            </p>
            <textarea
              placeholder="Reason for removal (optional)..."
              value={kickReason}
              onChange={e => setKickReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmProp(null); setKickReason(''); }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleKickTenant}
                disabled={!!kicking}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-red-700 disabled:bg-red-400 flex items-center justify-center gap-2"
              >
                {kicking ? <Loader2 className="animate-spin w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                Remove Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No properties found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Property', 'Landlord', 'Location', 'Status', 'Current Tenant', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const st = STATUS_STYLES[p.status] || STATUS_STYLES.available;
                  const tenant = p.activeAgreement?.tenant;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px]">
                        <p className="truncate">{p.title}</p>
                        <p className="text-xs text-gray-400">{p.type}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {p.landlord?.name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-xs">{p.address?.city || '—'}, {p.address?.state || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {tenant ? (
                          <div>
                            <p className="font-semibold text-gray-900">{tenant.name}</p>
                            <p className="text-xs text-gray-400">{tenant.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No tenant</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tenant ? (
                          <button
                            onClick={() => setConfirmProp(p)}
                            className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Kick Tenant
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
