'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { ShieldCheck, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ACTION_COLORS = {
  CREATED: 'bg-blue-100 text-blue-700',
  SIGNED: 'bg-green-100 text-green-700',
  REMINDER_SENT: 'bg-indigo-100 text-indigo-700',
  LATE_FEE_APPLIED: 'bg-red-100 text-red-700',
  AUTO_EXPIRED: 'bg-gray-100 text-gray-600',
  OVERDUE_NOTICE_SENT: 'bg-orange-100 text-orange-700',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [action, setAction]   = useState('');

  const LIMIT = 50;

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (action) params.set('action', action);
      const { data } = await api.get(`/admin/audit-logs?${params}`);
      setLogs(data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page, action]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Audit Logs</h1>
        <p className="text-gray-400 text-sm mt-1">Platform-wide agreement activity trail</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          <option value="CREATED">Created</option>
          <option value="SIGNED">Signed</option>
          <option value="PAYMENT_RECEIVED">Payment Received</option>
          <option value="LATE_FEE_APPLIED">Late Fee Applied</option>
          <option value="REMINDER_SENT">Reminder Sent</option>
          <option value="AUTO_EXPIRED">Auto Expired</option>
          <option value="OVERDUE_NOTICE_SENT">Overdue Notice Sent</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Action</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Agreement</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">IP Address</th>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">
                    {String(log.agreementId).slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{log.ipAddress || '—'}</td>
                  <td className="px-6 py-3 text-xs text-gray-600 max-w-xs truncate">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">Page {page}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-blue-400 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!hasMore}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-blue-400 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
