'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  MapPin, Building2, Bed, Bath, Shield, ArrowLeft, 
  Send, Loader2, FileText, ChevronLeft, ChevronRight, Image as ImageIcon,
  CheckCircle, MessageSquare
} from 'lucide-react';

function ListingDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get('viewOnly') === 'true'; 

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [applied, setApplied] = useState(false);
  const [submissionTime, setSubmissionTime] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    const user = stored ? JSON.parse(stored) : null;
    if (user) setCurrentUser(user);

    const fetchListing = async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        setListing(data);

        if (user && data.applications && data.applications.length > 0) {
          const existingApp = data.applications.find(
            (app) => (app.tenant === user._id || app.tenant?._id === user._id)
          );
          
          if (existingApp) {
            setApplied(true);
            setMessage(existingApp.message || '');
            setSubmissionTime(existingApp.createdAt ? new Date(existingApp.createdAt) : null);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleApply = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=/browse/${id}`);
      return;
    }
    if (!confirm('Submit your application for this property?')) return;

    setApplying(true);
    try {
      const { data } = await api.post(`/listings/${id}/apply`, { message });
      setApplied(true);
      setSubmissionTime(new Date());
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <p className="text-gray-500 font-medium text-lg">Listing not found.</p>
    </div>
  );

  const hasImages = listing.images && listing.images.length > 0;

  return (
    <main className="flex-grow pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <button onClick={() => router.back()} className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium group">
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-2">
              {hasImages ? (
                <div className="space-y-2">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                    <img src={listing.images[currentImageIndex]} alt="Property" className="w-full h-full object-contain" />
                    {listing.images.length > 1 && (
                      <>
                        <button onClick={() => setCurrentImageIndex(prev => (prev === 0 ? listing.images.length - 1 : prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => setCurrentImageIndex(prev => (prev + 1) % listing.images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"><ChevronRight className="h-5 w-5" /></button>
                      </>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">{currentImageIndex + 1} / {listing.images.length}</div>
                  </div>
                  {listing.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {listing.images.map((img, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-blue-600' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={img} alt="thumb" className="w-full h-full object-cover" /></button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400"><ImageIcon className="h-12 w-12 mb-2 opacity-50" /><p>No images available</p></div>
              )}
            </div>

            {/* Main Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                  <div className="flex items-center text-gray-500 mt-2 font-medium"><MapPin className="h-4 w-4 mr-1 text-blue-500" />{listing.address?.street}, {listing.address?.city}, {listing.address?.state}</div>
                </div>
                <span className="inline-flex px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full capitalize self-start">{listing.type}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex flex-col items-center"><Bed className="h-5 w-5 text-blue-500 mb-1" /><p className="text-lg font-bold text-gray-900">{listing.specs?.bedrooms || '—'}</p><p className="text-xs text-gray-500 uppercase font-medium">Bedrooms</p></div>
                <div className="flex flex-col items-center"><Bath className="h-5 w-5 text-blue-500 mb-1" /><p className="text-lg font-bold text-gray-900">{listing.specs?.bathrooms || '—'}</p><p className="text-xs text-gray-500 uppercase font-medium">Bathrooms</p></div>
                <div className="flex flex-col items-center"><Building2 className="h-5 w-5 text-blue-500 mb-1" /><p className="text-lg font-bold text-gray-900">{listing.specs?.sizeSqFt || '—'}</p><p className="text-xs text-gray-500 uppercase font-medium">Sq Ft</p></div>
              </div>
            </div>

            {/* Financials */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Financial Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl"><p className="text-xs text-blue-600 font-semibold uppercase mb-1">Monthly Rent</p><p className="text-2xl font-bold text-blue-700">Rs. {listing.financials?.monthlyRent?.toLocaleString()}</p></div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl"><p className="text-xs text-gray-500 font-semibold uppercase mb-1">Deposit</p><p className="text-xl font-bold text-gray-900">Rs. {listing.financials?.securityDeposit?.toLocaleString()}</p></div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl"><p className="text-xs text-gray-500 font-semibold uppercase mb-1">Maintenance</p><p className="text-xl font-bold text-gray-900">Rs. {listing.financials?.maintenanceFee?.toLocaleString() || '0'}</p></div>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="mb-6"><p className="text-3xl font-bold text-blue-600 mb-1">Rs. {listing.financials?.monthlyRent?.toLocaleString()}</p><p className="text-sm text-gray-500 font-medium">per month</p></div>
              <div className="flex items-center text-sm text-gray-700 font-medium mb-6 p-3 bg-gray-50 border border-gray-100 rounded-lg"><Shield className="h-5 w-5 mr-3 text-green-500" />Listed by {listing.landlord?.name}</div>

              {isViewOnly ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"><FileText className="h-6 w-6 text-blue-500 mx-auto mb-2" /><p className="text-sm font-medium text-blue-800">You have an active lease for this property.</p></div>
              ) : applied ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <div className="text-center mb-4"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-green-800 font-bold text-lg">Already Applied</p></div>
                  <div className="bg-white p-4 rounded-md border border-green-100 shadow-sm">
                    <div className="flex items-center text-gray-500 mb-2"><MessageSquare className="h-4 w-4 mr-1" /><span className="text-xs font-bold uppercase">Your Message</span></div>
                    <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded">"{message || 'No additional message provided.'}"</p>
                    {submissionTime && <p className="mt-3 text-[10px] text-gray-400 font-medium text-center border-t pt-2 uppercase tracking-tighter">Submitted: {submissionTime.toLocaleString()}</p>}
                  </div>
                </div>
              ) : (
                <>
                  <textarea rows={4} placeholder="Introduce yourself..." className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 mb-4 resize-none transition-all shadow-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <button onClick={handleApply} disabled={applying} className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center transition-all shadow-md">{applying ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}{currentUser ? 'Submit Application' : 'Login to Apply'}</button>
                  {!currentUser && <p className="text-xs text-gray-500 font-medium text-center mt-3">Tenant login required to apply.</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Wrapper to handle Next.js searchParams requirement
export default function ListingDetailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans selection:bg-blue-100">
      <Navbar />
      <Suspense fallback={<div className="flex-grow pt-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>}>
        <ListingDetailContent />
      </Suspense>
      <Footer />
    </div>
  );
}