'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { User, Building2, CheckCircle, XCircle, Loader2, Phone, Mail, MessageSquare, Calendar,Clock } from 'lucide-react';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const { data } = await api.get('/listings/applications');
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (applicationId, status) => {
    const action = status === 'accepted' ? 'accept and create a lease draft for' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this application?`)) return;

    setProcessingId(applicationId);
    try {
      // Send the decision to the backend
      await api.put(`/listings/applications/${applicationId}`, { status });
      
      if (status === 'accepted') {
        alert('Application accepted! A draft agreement has been automatically generated in your Agreements tab.');
      }
      
      fetchApplications();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update application');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = applications.filter(a => a.status === 'pending');
  const decided = applications.filter(a => a.status !== 'pending');

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rental Applications</h1>
        {pending.length > 0 && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full border border-yellow-200 shadow-sm">
            {pending.length} Pending Review
          </span>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200">
          <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-900 text-lg">No applications yet</p>
          <p className="mt-1 text-sm text-gray-500">When tenants apply to your active listings, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Pending Inbox */}
          {pending.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center">
                <span className="bg-yellow-100 p-1.5 rounded-md mr-2"><Clock className="h-5 w-5 text-yellow-600" /></span>
                Needs Review
              </h2>
              <div className="space-y-4">
                {pending.map((app) => (
                  <ApplicationCard
                    key={app._id}
                    app={app}
                    processingId={processingId}
                    onDecision={handleDecision}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Decisions History */}
          {decided.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">Decision History</h2>
              <div className="space-y-4">
                {decided.map((app) => (
                  <ApplicationCard
                    key={app._id}
                    app={app}
                    processingId={processingId}
                    onDecision={handleDecision}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component for individual application cards
function ApplicationCard({ app, processingId, onDecision }) {
  // Determine border and background colors based on status
  let cardStyle = "border-l-4 border-yellow-400 bg-white shadow-md";
  if (app.status === 'accepted') cardStyle = "border-l-4 border-green-500 bg-white opacity-80";
  if (app.status === 'rejected') cardStyle = "border-l-4 border-red-400 bg-gray-50 opacity-60";

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-100 transition-all ${cardStyle}`}>
      <div className="p-5 flex flex-col md:flex-row justify-between gap-6">
        
        {/* Left: Applicant Details */}
        <div className="flex items-start space-x-4 flex-1">
          <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-blue-600 font-bold text-lg">
              {app.tenant?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{app.tenant?.name}</h3>
            
            {/* Contact Info Row */}
            <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 mt-1 mb-3">
              <span className="flex items-center"><Mail className="h-3.5 w-3.5 mr-1 text-gray-400" />{app.tenant?.email}</span>
              {app.tenant?.phoneNumber && (
                <span className="flex items-center mt-1 sm:mt-0"><Phone className="h-3.5 w-3.5 mr-1 text-gray-400" />{app.tenant?.phoneNumber}</span>
              )}
            </div>
            
            {/* Property Context */}
            <div className="flex flex-col sm:flex-row sm:items-center text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-100 inline-flex gap-2">
              <span className="flex items-center text-blue-700"><Building2 className="h-4 w-4 mr-1.5" />{app.property?.title}</span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="text-green-700">Rs. {app.property?.financials?.monthlyRent?.toLocaleString()} /mo</span>
            </div>
            
            {/* Tenant Message */}
            {app.message && (
              <div className="mt-4 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                <div className="flex items-center text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
                  <MessageSquare className="h-3 w-3 mr-1" /> Message
                </div>
                <p className="text-sm text-gray-700 italic">"{app.message}"</p>
              </div>
            )}
            
            <p className="text-xs text-gray-400 mt-3 flex items-center">
              <Calendar className="h-3 w-3 mr-1" /> Applied: {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Right: Actions / Status */}
        <div className="flex flex-col sm:flex-row md:flex-col justify-center items-end gap-3 flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
          {app.status === 'pending' ? (
            <>
              <button
                onClick={() => onDecision(app._id, 'accepted')}
                disabled={processingId === app._id}
                className="w-full sm:w-auto md:w-full inline-flex justify-center items-center px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:bg-green-400 shadow-sm transition-transform active:scale-95"
              >
                {processingId === app._id
                  ? <Loader2 className="animate-spin h-4 w-4" />
                  : <><CheckCircle className="h-4 w-4 mr-2" /> Accept & Draft Lease</>
                }
              </button>
              <button
                onClick={() => onDecision(app._id, 'rejected')}
                disabled={processingId === app._id}
                className="w-full sm:w-auto md:w-full inline-flex justify-center items-center px-4 py-2 bg-white text-red-600 border border-red-200 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" /> Decline
              </button>
            </>
          ) : (
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
              app.status === 'accepted' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {app.status === 'accepted'
                ? <><CheckCircle className="h-4 w-4 mr-2" /> Accepted</>
                : <><XCircle className="h-4 w-4 mr-2" /> Declined</>
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
}