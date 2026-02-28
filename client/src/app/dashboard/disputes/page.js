'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  Scale, Plus, Loader2, ChevronDown, ChevronUp, Send,
  CheckCircle, Clock, AlertCircle, X
} from 'lucide-react';

const STATUS_CONFIG = {
  open:         { label: 'Open',         color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  mediation:    { label: 'Mediation',    color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  resolved:     { label: 'Resolved',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  closed:       { label: 'Closed',       color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
};

const CATEGORIES = ['rent','deposit','maintenance','noise','damage','lease_violation','other'];

export default function DisputesPage() {
  const [user,      setUser]      = useState(null);
  const [disputes,  setDisputes]  = useState([]);
  const [agreements,setAgreements]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [expanded,  setExpanded]  = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [comment,   setComment]   = useState({});
  const [posting,   setPosting]   = useState(null);

  const [form, setForm] = useState({ agreementId: '', title: '', description: '', category: 'other' });

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      if (['tenant','landlord'].includes(u.role)) {
        api.get('/agreements').then(({ data }) => {
          setAgreements(data.filter(a => ['active','expired','signed'].includes(a.status)));
        }).catch(console.error);
      }
    }
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/disputes');
      setDisputes(data.disputes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/disputes', form);
      setShowForm(false);
      setForm({ agreementId: '', title: '', description: '', category: 'other' });
      fetchDisputes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to file dispute');
    } finally { setSubmitting(false); }
  };

  const handleComment = async (disputeId) => {
    const content = comment[disputeId];
    if (!content?.trim()) return;
    setPosting(disputeId);
    try {
      await api.post(`/disputes/${disputeId}/comments`, { content });
      setComment(c => ({ ...c, [disputeId]: '' }));
      fetchDisputes();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setPosting(null); }
  };

  const handleAdminUpdate = async (disputeId, status, resolutionNote) => {
    try {
      await api.put(`/disputes/${disputeId}`, { status, resolutionNote });
      fetchDisputes();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const canFile   = ['tenant','landlord'].includes(user?.role);
  const isAdmin   = user?.role === 'admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Disputes</h1>
          <p className="text-gray-400 text-sm mt-1">File and track rental disputes</p>
        </div>
        {canFile && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> File Dispute
          </button>
        )}
      </div>

      {/* File Form */}
      {showForm && canFile && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-4">
          <h3 className="font-black text-gray-900">File a Dispute</h3>

          <select
            required
            value={form.agreementId}
            onChange={e => setForm(f => ({ ...f, agreementId: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Agreement / Property</option>
            {agreements.map(a => (
              <option key={a._id} value={a._id}>
                {a.property?.title} — {a.status}
              </option>
            ))}
          </select>

          <input
            required
            placeholder="Dispute title (e.g. Landlord refusing deposit refund)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            required
            placeholder="Describe the issue in detail. Include dates, amounts, and any relevant history…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
          </select>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400">
              {submitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Submit Dispute'}
            </button>
          </div>
        </form>
      )}

      {/* Disputes List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Scale className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No disputes filed</p>
          {canFile && <p className="text-sm text-gray-400 mt-1">Use the button above to file a dispute if needed</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.open;
            const isOpen = expanded[d._id];
            const myId   = user?._id;

            return (
              <div key={d._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${sc.color}`}>{sc.label}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">{d.category?.replace('_',' ')}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{d.title}</p>
                      <p className="text-xs text-gray-400">
                        {d.property?.title} • Filed by {d.filedBy?.name} • {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setExpanded(ex => ({ ...ex, [d._id]: !ex[d._id] }))} className="ml-3 text-gray-400 hover:text-gray-600 shrink-0">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 pb-5 space-y-5">
                    {/* Description */}
                    <p className="text-sm text-gray-700 mt-4 leading-relaxed">{d.description}</p>

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Filed By</p>
                        <p className="font-semibold text-sm text-gray-900">{d.filedBy?.name}</p>
                        <p className="text-xs text-gray-400">{d.filedBy?.role}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Against</p>
                        <p className="font-semibold text-sm text-gray-900">{d.against?.name}</p>
                        <p className="text-xs text-gray-400">{d.against?.role}</p>
                      </div>
                    </div>

                    {/* Resolution note */}
                    {d.resolutionNote && (
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-1">Admin Resolution</p>
                        <p className="text-sm text-green-900">{d.resolutionNote}</p>
                        {d.resolvedBy && <p className="text-xs text-green-600 mt-1">— {d.resolvedBy.name} on {new Date(d.resolvedAt).toLocaleDateString()}</p>}
                      </div>
                    )}

                    {/* Admin Controls */}
                    {isAdmin && d.status !== 'closed' && (
                      <AdminControls dispute={d} onUpdate={handleAdminUpdate} />
                    )}

                    {/* Comment Thread */}
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Discussion ({d.comments?.length || 0})</p>
                      <div className="space-y-3 mb-4">
                        {(d.comments || []).map((c, i) => (
                          <div key={i} className={`flex gap-3 ${c.author?._id === myId ? 'flex-row-reverse' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                              {c.author?.name?.[0] || '?'}
                            </div>
                            <div className={`max-w-sm rounded-2xl px-4 py-2.5 ${c.author?._id === myId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                              <p className="text-xs font-semibold mb-0.5 opacity-70">{c.author?.name} · {c.author?.role}</p>
                              <p className="text-sm">{c.content}</p>
                              <p className={`text-[10px] mt-1 ${c.author?._id === myId ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(c.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add comment */}
                      {d.status !== 'closed' && (
                        <div className="flex gap-2">
                          <input
                            value={comment[d._id] || ''}
                            onChange={e => setComment(c => ({ ...c, [d._id]: e.target.value }))}
                            placeholder="Add a comment..."
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={e => e.key === 'Enter' && handleComment(d._id)}
                          />
                          <button
                            onClick={() => handleComment(d._id)}
                            disabled={posting === d._id || !comment[d._id]?.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition"
                          >
                            {posting === d._id ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
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

function AdminControls({ dispute, onUpdate }) {
  const [status, setStatus] = useState(dispute.status);
  const [note,   setNote]   = useState(dispute.resolutionNote || '');

  return (
    <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">Admin — Update Dispute</p>
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="mediation">Mediation</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Resolution note (shown to both parties)..."
        rows={2}
        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white"
      />
      <button
        onClick={() => onUpdate(dispute._id, status, note)}
        className="bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-amber-700 transition"
      >
        Save Update
      </button>
    </div>
  );
}
