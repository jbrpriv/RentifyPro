'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import { Search, UserCheck, Calendar, FileText, Loader2, AlertCircle } from 'lucide-react';

function AgreementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Find Tenant, 2: Terms
  const [tenantEmail, setTenantEmail] = useState('');
  const [foundTenant, setFoundTenant] = useState(null);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    rentAmount: '',
    depositAmount: ''
  });

  // Load Property Defaults
  useEffect(() => {
    if (propertyId) {
      // Ideally fetch property details here to pre-fill rent
      // For now, we leave it empty or manual
    }
  }, [propertyId]);

  const lookupTenant = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/users/lookup', { email: tenantEmail });
      if (data.role !== 'tenant') {
        alert('This user is registered as a Landlord, not a Tenant.');
        setFoundTenant(null);
      } else {
        setFoundTenant(data);
        setStep(2);
      }
    } catch (error) {
      alert('Tenant not found. Please ask them to register first.');
      setFoundTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foundTenant || !propertyId) return;

    setLoading(true);
    try {
      await api.post('/agreements', {
        tenantId: foundTenant._id,
        propertyId: propertyId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        rentAmount: formData.rentAmount,
        depositAmount: formData.depositAmount
      });
      
      // Redirect to Agreement List (Success)
      router.push('/dashboard/agreements');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create agreement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Rental Agreement</h1>
        <p className="text-gray-500">Draft a new legal contract for your property.</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Step 1: Tenant Lookup */}
        <div className={`p-6 ${step === 2 ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-medium text-gray-900 flex items-center mb-4">
            <Search className="w-5 h-5 mr-2 text-blue-500" />
            Step 1: Find Tenant
          </h2>
          <div className="flex gap-4">
            <input
              type="email"
              placeholder="Enter Tenant's Email (e.g., tenant@example.com)"
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
            />
            <button
              onClick={lookupTenant}
              disabled={loading || !tenantEmail}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Search'}
            </button>
          </div>
          {foundTenant && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              Found: <strong>{foundTenant.name}</strong> ({foundTenant.email})
            </div>
          )}
        </div>

        {/* Step 2: Lease Terms */}
        {step === 2 && (
          <div className="p-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center mb-6">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Step 2: Lease Terms
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Rent (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({...formData, rentAmount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Security Deposit (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
                  Generate Agreement
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Suspense Wrapper for Next.js 13+ useSearchParams
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AgreementForm />
    </Suspense>
  );
}