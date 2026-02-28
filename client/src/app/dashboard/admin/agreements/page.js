'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  FileText, Search, Filter, Loader2, AlertCircle,
  CheckCircle, Clock, XCircle, Eye,
} from 'lucide-react';

const STATUS_STYLES = {
  draft:      { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: Clock,         label: 'Draft' },
  sent:       { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Clock,         label: 'Sent' },
  signed:     { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: CheckCircle,   label: 'Signed' },
  active:     { bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle,   label: 'Active' },
  expired:    { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: AlertCircle,   label: 'Expired' },
  terminated: { bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle,       label: 'Terminated' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export default function AdminAgreementsPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/admin/agreements')
      .then(({ data }) => setAgreements(Array.isArray(data) ? data : data.agreements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = agreements.filter((a) => {
    const matchesSearch =
      !search ||
      a.landlord?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.property?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = agreements.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            All Agreements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Platform-wide agreement monitor</p>
        </div>
        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
          {agreements.length} total
        </span>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(STATUS_STYLES).map(([status, s]) => {
          const Icon = s.icon;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                statusFilter === status
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-transparent bg-white hover:border-gray-200'
              } shadow-sm`}
            >
              <div className={`inline-flex p-1.5 rounded-lg mb-1.5 ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.text}`} />
              </div>
              <p className="text-lg font-bold text-gray-900">{counts[status] || 0}</p>
              <p className="text-xs text-gray-500 capitalize">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by landlord, tenant or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_STYLES).map(([s, v]) => (
              <option key={s} value={s}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No agreements found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Property', 'Landlord', 'Tenant', 'Term', 'Rent / mo', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                      {a.property?.title || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.landlord?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.tenant?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {a.term?.startDate
                        ? `${new Date(a.term.startDate).toLocaleDateString()} → ${new Date(a.term.endDate).toLocaleDateString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">
                      {a.financials?.rentAmount
                        ? `Rs. ${a.financials.rentAmount.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const token = JSON.parse(localStorage.getItem('userInfo') || '{}')?.token || '';
                          const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/agreements/${a._id}/pdf`;
                          fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                            .then(r => r.blob())
                            .then(blob => {
                              const bUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = bUrl;
                              link.download = `agreement-${a._id}.pdf`;
                              link.click();
                              URL.revokeObjectURL(bUrl);
                            })
                            .catch(() => alert('Failed to download PDF'));
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}