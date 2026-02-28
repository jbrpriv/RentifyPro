'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import { FileText, Download, Calendar, User, Loader2, CheckCircle, Clock, PenLine } from 'lucide-react';

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId]     = useState(null);
  const [renewModal, setRenewModal]   = useState(null); // holds agreement object
  const [renewForm,  setRenewForm]    = useState({ newEndDate: '', newRentAmount: '', notes: '' });
  const [renewLoading, setRenewLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setCurrentUser(JSON.parse(stored));
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const { data } = await api.get('/agreements');
      setAgreements(data);
    } catch (error) {
      console.error('Failed to fetch agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (agreementId) => {
    if (!confirm('By clicking OK you are digitally signing this agreement. This action cannot be undone.')) return;

    setSigningId(agreementId);
    try {
      const { data } = await api.put(`/agreements/${agreementId}/sign`);
      alert(`Signed successfully! Agreement status: ${data.status}`);
      fetchAgreements(); // Refresh the list
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to sign agreement');
    } finally {
      setSigningId(null);
    }
  };

  const handleDownload = async (id, title) => {
    try {
      const response = await api.get(`/agreements/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Agreement-${title?.replace(/\s+/g, '-') || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading PDF');
    }
  };

  // Check if current user has already signed
  const hasUserSigned = (agreement) => {
    if (!currentUser) return false;
    const isLandlord = agreement.landlord?._id === currentUser._id;
    const isTenant = agreement.tenant?._id === currentUser._id;
    if (isLandlord) return agreement.signatures?.landlord?.signed;
    if (isTenant) return agreement.signatures?.tenant?.signed;
    return false;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  const handleProposeRenewal = async (e) => {
    e.preventDefault();
    setRenewLoading(true);
    try {
      await api.put(`/agreements/${renewModal._id}/renew`, renewForm);
      alert('Renewal proposal sent to tenant!');
      setRenewModal(null);
      fetchAgreements();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send proposal');
    } finally { setRenewLoading(false); }
  };

  const handleRenewalResponse = async (id, accept) => {
    if (!confirm(accept ? 'Accept this renewal proposal?' : 'Decline this renewal proposal?')) return;
    try {
      const { data } = await api.put(`/agreements/${id}/renew/respond`, { accept });
      alert(data.message);
      fetchAgreements();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rental Agreements</h1>

      {agreements.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg shadow border-2 border-dashed border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No agreements found.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {agreements.map((ag) => (
              <li key={ag._id} className="hover:bg-gray-50 transition-colors">
                <div className="px-6 py-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Left: Info */}
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {ag.property?.title || 'Property Lease'}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Tenant: {ag.tenant?.name}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Ends: {new Date(ag.term?.endDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Signature Status */}
                        <div className="flex gap-3 mt-2">
                          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${ag.signatures?.landlord?.signed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {ag.signatures?.landlord?.signed
                              ? <><CheckCircle className="h-3 w-3 mr-1" /> Landlord Signed</>
                              : <><Clock className="h-3 w-3 mr-1" /> Landlord Pending</>
                            }
                          </span>
                          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${ag.signatures?.tenant?.signed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {ag.signatures?.tenant?.signed
                              ? <><CheckCircle className="h-3 w-3 mr-1" /> Tenant Signed</>
                              : <><Clock className="h-3 w-3 mr-1" /> Tenant Pending</>
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ag.status)}`}>
                        {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                      </span>

                      {/* Sign button — only show if user hasn't signed yet */}
                      {!hasUserSigned(ag) && ag.status !== 'active' && ag.status !== 'expired' && (
                        <button
                          onClick={() => handleSign(ag._id)}
                          disabled={signingId === ag._id}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                        >
                          {signingId === ag._id
                            ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            : <PenLine className="h-4 w-4 mr-2" />
                          }
                          Sign
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(ag._id, ag.property?.title)}
                        className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4 mr-2" /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}