'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { Building2, MapPin, Plus, FileText, Loader2, UserPlus, CheckCircle, Clock } from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [inviting, setInviting]     = useState('');
  const [msg, setMsg]               = useState('');

  const fetchProperties = async () => {
    try {
      const { data } = await api.get('/properties');
      setProperties(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleTogglePublish = async (propertyId, currentState) => {
    try {
      const description = currentState ? '' : prompt('Add a listing description (optional):') || '';
      await api.put(`/listings/${propertyId}/publish`, { listingDescription: description });
      fetchProperties();
    } catch (err) { alert('Failed to update listing status'); }
  };

  const handleInviteManager = async (propertyId) => {
    const email = prompt('Enter the property manager\'s email address:');
    if (!email) return;
    setInviting(propertyId);
    try {
      // Look up PM by email first
      const { data: pmUser } = await api.post('/users/lookup', { email });
      if (pmUser.role !== 'property_manager') {
        alert(`${pmUser.name} is a ${pmUser.role}, not a property manager.`);
        setInviting('');
        return;
      }
      await api.post(`/properties/${propertyId}/invite-manager`, { managerId: pmUser._id });
      setMsg('✅ Invitation sent! The property manager will be notified by email.');
      setTimeout(() => setMsg(''), 5000);
      fetchProperties();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Failed to send invitation'));
      setTimeout(() => setMsg(''), 5000);
    } finally { setInviting(''); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">My Properties</h1>
        <Link href="/dashboard/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" /> Add Property
        </Link>
      </div>

      {msg && <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</div>}

      {properties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <Building2 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-bold text-gray-700">No properties yet</h3>
          <p className="mt-1 text-sm text-gray-400">Get started by creating your first property profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const invStatus = property.pmInvitation?.status;
            const hasPendingInvite = invStatus === 'pending';
            const hasManager = !!property.managedBy;

            return (
              <div key={property._id} className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-gray-900 truncate">{property.title}</h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {property.address.city}, {property.address.state}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        property.status === 'vacant' ? 'bg-blue-100 text-blue-700'
                        : property.status === 'occupied' ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {property.status}
                      </span>
                      {property.isListed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">Listed</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rent</dt>
                        <dd className="mt-0.5 text-base font-black text-gray-900">Rs. {property.financials.monthlyRent.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type</dt>
                        <dd className="mt-0.5 text-sm text-gray-900 capitalize">{property.type}</dd>
                      </div>
                    </dl>

                    {/* PM Status */}
                    <div className="mt-3">
                      {hasManager ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
                          <CheckCircle className="w-3 h-3" />
                          <span className="font-bold">Managed by: {property.managedBy?.name || 'PM'}</span>
                        </div>
                      ) : hasPendingInvite ? (
                        <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5">
                          <Clock className="w-3 h-3" />
                          <span className="font-bold">Invitation sent — awaiting PM response</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No property manager assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-5 py-3 flex flex-wrap gap-2">
                  <Link href={`/dashboard/properties/edit?id=${property._id}`}
                    className="inline-flex justify-center items-center px-3 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600 bg-white hover:bg-gray-50">
                    Edit
                  </Link>
                  {property.status !== 'occupied' && (
                    <button onClick={() => handleTogglePublish(property._id, property.isListed)}
                      className={`flex-1 inline-flex justify-center items-center px-3 py-2 text-xs font-bold rounded-xl ${
                        property.isListed ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}>
                      {property.isListed ? 'Unlist' : 'Publish'}
                    </button>
                  )}
                  <Link href={`/dashboard/agreements/new?propertyId=${property._id}`}
                    className="inline-flex justify-center items-center px-3 py-2 text-xs font-bold rounded-xl text-blue-700 bg-blue-100 hover:bg-blue-200">
                    <FileText className="mr-1 h-3.5 w-3.5" /> Agreement
                  </Link>
                  {!hasManager && !hasPendingInvite && (
                    <button onClick={() => handleInviteManager(property._id)} disabled={inviting === property._id}
                      className="flex-1 inline-flex justify-center items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50">
                      {inviting === property._id ? <Loader2 className="animate-spin w-3 h-3" /> : <UserPlus className="h-3.5 w-3.5" />}
                      Invite PM
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
