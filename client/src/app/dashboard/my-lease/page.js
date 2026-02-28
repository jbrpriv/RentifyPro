'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  PenLine, 
  Loader2, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone
} from 'lucide-react';

export default function MyLeasePage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLandlord, setShowLandlord] = useState({}); // Track which landlord details are expanded

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setCurrentUser(JSON.parse(stored));
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const { data } = await api.get('/agreements');
      setAgreements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (agreementId) => {
    if (!confirm('By clicking OK you are digitally signing this agreement. This action cannot be undone.')) return;
    setSigningId(agreementId);
    try {
      const { data } = await api.put(`/agreements/${agreementId}/sign`);
      alert(`Signed! Agreement status is now: ${data.status}`);
      fetchAgreements();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to sign');
    } finally {
      setSigningId(null);
    }
  };

  const handlePayment = async (agreementId) => {
    try {
      const { data } = await api.post('/payments/create-checkout-session', { agreementId });
      window.location.href = data.url;
    } catch (error) {
      alert('Payment initialization failed. Please try again.');
    }
  };

  const handleDownload = async (id, title) => {
    try {
      const response = await api.get(`/agreements/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Lease-${title?.replace(/\s+/g, '-') || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Error downloading PDF');
    }
  };

  const toggleLandlordDetails = (id) => {
    setShowLandlord(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to determine the status bar colors and text dynamically
  const getStatusStyles = (status, isPaid) => {
    if (status === 'active' || isPaid) {
      return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Active Lease' };
    }
    if (status === 'signed') {
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: CreditCard, label: 'Awaiting Initial Payment' };
    }
    if (status === 'sent') {
      return { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending Signatures' };
    }
    return { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-700', icon: FileText, label: 'Draft' };
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">My Lease Agreements</h1>

      {agreements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow border-2 border-dashed border-gray-200 flex flex-col items-center">
          <FileText className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No lease agreements yet</h3>
          <p className="mt-1 text-sm text-gray-500">Your landlord will send you an agreement to review and sign here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {agreements.map((ag) => {
            const tenantSigned = ag.signatures?.tenant?.signed;
            const landlordSigned = ag.signatures?.landlord?.signed;
            const style = getStatusStyles(ag.status, ag.isPaid);
            const StatusIcon = style.icon;
            
            // Calculate Total Initial Payment (Rent + Deposit)
            const rent = ag.financials?.rentAmount || 0;
            const deposit = ag.financials?.depositAmount || 0;
            const totalDueAtSigning = rent + deposit;

            return (
              <div key={ag._id} className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100 transition-all hover:shadow-lg">
                {/* Dynamic Status Bar */}
                <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b ${style.bg} ${style.border}`}>
                  <div className="flex items-center mb-2 sm:mb-0">
                    <StatusIcon className={`h-6 w-6 mr-2 ${style.text}`} />
                    <span className={`font-bold text-base ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium bg-white/50 px-3 py-1 rounded-full">
                    Created: {new Date(ag.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-6">
                  {/* Property Header & Actions */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-100 gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <Building2 className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{ag.property?.title}</h2>
                        <p className="text-sm text-gray-500">{ag.property?.address?.street}, {ag.property?.address?.city}</p>
                      </div>
                    </div>
                    
                    {/* View Property Button */}
                    {ag.property?._id && (
                      <Link 
                        href={`/browse/${ag.property._id}?viewOnly=true`}
                        className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Listing
                      </Link>
                    )}
                  </div>

                  {/* Main Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center text-gray-500 mb-2">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Financials</span>
                      </div>
                      <p className="font-bold text-gray-900">Rs. {rent.toLocaleString()} <span className="text-xs font-normal text-gray-500">/mo</span></p>
                      <p className="text-xs text-gray-500 mt-1">Deposit: Rs. {deposit.toLocaleString()}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center text-gray-500 mb-2">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Lease Term</span>
                      </div>
                      <p className="font-bold text-gray-900">{new Date(ag.term?.startDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500 mt-1">To: {new Date(ag.term?.endDate).toLocaleDateString()}</p>
                    </div>

                    {/* Signature Status Modules */}
                    <div className={`p-4 rounded-lg border ${tenantSigned ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                      <div className="flex items-center mb-2">
                        {tenantSigned ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <Clock className="h-4 w-4 text-yellow-500 mr-1" />}
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Your Signature</span>
                      </div>
                      {tenantSigned
                        ? <p className="text-sm font-medium text-green-700">Signed on {new Date(ag.signatures.tenant.signedAt).toLocaleDateString()}</p>
                        : <p className="text-sm font-medium text-yellow-700">Signature Required</p>
                      }
                    </div>

                    <div className={`p-4 rounded-lg border ${landlordSigned ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center mb-2">
                        {landlordSigned ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <Clock className="h-4 w-4 text-gray-400 mr-1" />}
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Landlord</span>
                      </div>
                      {landlordSigned
                        ? <p className="text-sm font-medium text-green-700">Signed on {new Date(ag.signatures.landlord.signedAt).toLocaleDateString()}</p>
                        : <p className="text-sm font-medium text-gray-500">Awaiting Signature</p>
                      }
                    </div>
                  </div>

                  {/* Toggle Landlord Details */}
                  <div className="mb-6 border border-gray-100 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => toggleLandlordDetails(ag._id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-700">Landlord Details: {ag.landlord?.name}</span>
                      </div>
                      {showLandlord[ag._id] ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    
                    {showLandlord[ag._id] && (
                      <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row gap-6">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2 text-gray-400" /> {ag.landlord?.name}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" /> {ag.landlord?.email}
                        </div>
                        {ag.landlord?.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" /> {ag.landlord?.phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Primary Action Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                    
                    <div className="flex w-full sm:w-auto gap-3">
                      {/* Sign Button */}
                      {!tenantSigned && ag.status !== 'expired' && (
                        <button
                          onClick={() => handleSign(ag._id)}
                          disabled={signingId === ag._id}
                          className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-sm"
                        >
                          {signingId === ag._id ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <PenLine className="h-4 w-4 mr-2" />}
                          Sign Agreement
                        </button>
                      )}

                      {/* Download PDF */}
                      <button
                        onClick={() => handleDownload(ag._id, ag.property?.title)}
                        className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </button>
                    </div>

                    {/* Initial Payment Button (Security + First Month) */}
                    {ag.status === 'signed' && !ag.isPaid && (
                      <div className="w-full sm:w-auto flex flex-col items-end">
                        <p className="text-xs text-blue-600 font-medium mb-1 mr-1">Includes 1st Month Rent & Deposit</p>
                        <button
                          onClick={() => handlePayment(ag._id)}
                          className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5 transition-all"
                        >
                          <CreditCard className="h-5 w-5 mr-2" /> Pay Total: Rs. {totalDueAtSigning.toLocaleString()}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}