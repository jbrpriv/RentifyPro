'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { Wrench, Plus, Loader2, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700' },
  closed:      { label: 'Closed',      color: 'bg-gray-100 text-gray-500' },
};
const PRIORITY_CONFIG = {
  low:    { color: 'bg-gray-100 text-gray-500' },
  medium: { color: 'bg-amber-100 text-amber-700' },
  urgent: { color: 'bg-red-100 text-red-700' },
};
const CATEGORIES = ['plumbing','electrical','hvac','appliance','structural','pest','other'];

export default function MaintenancePage() {
  const [user, setUser]             = useState(null);
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [expanded, setExpanded]     = useState({});
  const [properties, setProperties] = useState([]);
  const [actionId, setActionId]     = useState(null);

  // Submit form state
  const [form, setForm] = useState({ propertyId: '', title: '', description: '', priority: 'medium', category: 'other' });
  const [submitting, setSubmitting] = useState(false);

  // Update form per request
  const [updateForm, setUpdateForm] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      if (u.role === 'tenant') {
        // Load tenant's active agreements for property selection
        api.get('/agreements').then(({ data }) => {
          const active = data.filter(a => a.status === 'active');
          setProperties(active.map(a => ({ _id: a.property?._id, title: a.property?.title })));
        }).catch(console.error);
      }
    }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/maintenance');
      setRequests(data.requests || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/maintenance', form);
      setShowForm(false);
      setForm({ propertyId: '', title: '', description: '', priority: 'medium', category: 'other' });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting request');
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (id) => {
    const data = updateForm[id];
    if (!data?.status) return;
    setActionId(id);
    try {
      await api.put(`/maintenance/${id}`, data);
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setActionId(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const isTenant = user?.role === 'tenant';
  const canUpdate = ['landlord','property_manager','admin'].includes(user?.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Maintenance Requests</h1>
          <p className="text-gray-400 text-sm mt-1">{requests.length} requests</p>
        </div>
        {isTenant && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
      </div>

      {/* Submit Form (Tenant Only) */}
      {showForm && isTenant && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-4">
          <h3 className="font-black text-gray-900">Submit Maintenance Request</h3>

          <select
            required
            value={form.propertyId}
            onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Property</option>
            {properties.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>

          <input
            required
            placeholder="Issue title (e.g. Leaking bathroom pipe)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            required
            placeholder="Describe the issue in detail..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-3">
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400">
              {submitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Wrench className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No maintenance requests</p>
          {isTenant && <p className="text-sm text-gray-400 mt-1">Submit a request if something needs fixing</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.open;
            const pc = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;

            return (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${sc.color}`}>{sc.label}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${pc.color}`}>{r.priority}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-400">
                        {r.property?.title}
                        {r.tenant && <> • {r.tenant.name}</>}
                        {' '}• {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {isTenant && r.status === 'open' && (
                      <button onClick={() => handleDelete(r._id)} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(ex => ({ ...ex, [r._id]: !ex[r._id] }))}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {expanded[r._id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded[r._id] && (
                  <div className="px-5 pb-5 border-t border-gray-50 space-y-4">
                    <p className="text-sm text-gray-700 mt-4">{r.description}</p>
                    {r.resolutionNotes && (
                      <div className="bg-green-50 rounded-xl p-3 text-sm text-green-800">
                        <strong>Resolution notes:</strong> {r.resolutionNotes}
                      </div>
                    )}

                    {/* Status History */}
                    {r.statusHistory?.length > 0 && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">History</p>
                        <div className="space-y-1">
                          {r.statusHistory.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              <span className="font-semibold">{h.status.replace('_',' ')}</span>
                              {h.note && <span>— {h.note}</span>}
                              <span className="text-gray-300">{new Date(h.changedAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Landlord/PM Update Panel */}
                    {canUpdate && r.status !== 'closed' && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Update Request</p>
                        <div className="flex flex-wrap gap-3">
                          <select
                            value={updateForm[r._id]?.status || r.status}
                            onChange={e => setUpdateForm(f => ({ ...f, [r._id]: { ...f[r._id], status: e.target.value } }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <input
                            placeholder="Add a note..."
                            value={updateForm[r._id]?.note || ''}
                            onChange={e => setUpdateForm(f => ({ ...f, [r._id]: { ...f[r._id], note: e.target.value } }))}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <textarea
                          placeholder="Resolution notes (optional)"
                          value={updateForm[r._id]?.resolutionNotes || ''}
                          onChange={e => setUpdateForm(f => ({ ...f, [r._id]: { ...f[r._id], resolutionNotes: e.target.value } }))}
                          rows={2}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => handleUpdate(r._id)}
                          disabled={actionId === r._id}
                          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
                        >
                          {actionId === r._id ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Save Update'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
