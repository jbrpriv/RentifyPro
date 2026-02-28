'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { CreditCard, CheckCircle, Clock, AlertCircle, Loader2, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  paid:              { label: 'Paid',             color: 'bg-green-100 text-green-700',  dot: 'bg-green-500', icon: CheckCircle },
  pending:           { label: 'Upcoming',         color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',  icon: Clock },
  overdue:           { label: 'Overdue',          color: 'bg-red-100 text-red-700',      dot: 'bg-red-500',   icon: AlertCircle },
  late_fee_applied:  { label: 'Late Fee Applied', color: 'bg-orange-100 text-orange-700',dot: 'bg-orange-500',icon: AlertCircle },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PaymentsPage() {
  const [agreements, setAgreements] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get('/agreements')
      .then(({ data }) => {
        const active = data.filter(a => a.status === 'active' && a.rentSchedule?.length > 0);
        setAgreements(active);
        if (active.length > 0) setSelected(active[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  const schedule = selected?.rentSchedule || [];
  const paid     = schedule.filter(e => e.status === 'paid').length;
  const overdue  = schedule.filter(e => ['overdue','late_fee_applied'].includes(e.status)).length;
  const pending  = schedule.filter(e => e.status === 'pending').length;
  const totalPaid = schedule.filter(e => e.status === 'paid').reduce((s, e) => s + (e.paidAmount || e.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Payment Schedule</h1>
        <p className="text-gray-400 text-sm mt-1">Track your rent payments across all months</p>
      </div>

      {agreements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No active payment schedule</p>
          <p className="text-sm text-gray-400 mt-1">Your payment calendar will appear here after your initial payment</p>
        </div>
      ) : (
        <>
          {/* Agreement Selector */}
          {agreements.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {agreements.map(a => (
                <button
                  key={a._id}
                  onClick={() => setSelected(a)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    selected?._id === a._id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {a.property?.title}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Months Paid"   value={paid}                                  icon={CheckCircle}  color="text-green-600"  bg="bg-green-50" />
                <SummaryCard label="Pending"        value={pending}                               icon={Clock}        color="text-blue-600"   bg="bg-blue-50" />
                <SummaryCard label="Overdue"        value={overdue}                               icon={AlertCircle}  color="text-red-600"    bg="bg-red-50" />
                <SummaryCard label="Total Paid"     value={`Rs. ${totalPaid.toLocaleString()}`}  icon={CreditCard}   color="text-indigo-600" bg="bg-indigo-50" />
              </div>

              {/* Property & Lease Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Active Lease</p>
                <h2 className="text-xl font-black text-gray-900">{selected.property?.title}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span>Rent: <strong className="text-gray-900">Rs. {selected.financials?.rentAmount?.toLocaleString()}/mo</strong></span>
                  <span>Grace period: <strong className="text-gray-900">{selected.financials?.lateFeeGracePeriodDays} days</strong></span>
                  <span>Late fee: <strong className="text-gray-900">Rs. {selected.financials?.lateFeeAmount}</strong></span>
                  <span>Lease ends: <strong className="text-gray-900">{new Date(selected.term?.endDate).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-black text-gray-900 mb-6 uppercase tracking-widest">Rent Calendar</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {schedule.map((entry, i) => {
                    const cfg  = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    const date = new Date(entry.dueDate);
                    const isThisMonth =
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear();

                    return (
                      <div
                        key={i}
                        className={`rounded-2xl p-4 border-2 transition-all ${
                          isThisMonth
                            ? 'border-blue-400 shadow-md'
                            : 'border-transparent bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black uppercase text-gray-400">
                            {MONTHS[date.getMonth()]} {date.getFullYear()}
                          </p>
                          {isThisMonth && <span className="text-[9px] bg-blue-100 text-blue-700 font-black uppercase px-1.5 py-0.5 rounded-full">This Month</span>}
                        </div>

                        <div className={`flex items-center gap-1.5 mb-3`}>
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <p className="font-black text-gray-900 text-sm">
                          Rs. {entry.amount?.toLocaleString()}
                        </p>

                        {entry.lateFeeApplied && (
                          <p className="text-[10px] text-orange-600 mt-1">
                            +Rs. {entry.lateFeeAmount} late fee
                          </p>
                        )}

                        {entry.paidDate && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Paid: {new Date(entry.paidDate).toLocaleDateString()}
                          </p>
                        )}

                        <p className="text-[10px] text-gray-400 mt-1">
                          Due: {date.toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`${bg} ${color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
    </div>
  );
}
