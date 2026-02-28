'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { Home, Loader2, X, Upload, ImagePlus, FileText, AlertCircle } from 'lucide-react';

export default function AddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [form, setForm] = useState({
    title: '',
    listingDescription: '',
    address: { street: '', city: '', state: '', zip: '' },
    type: 'apartment',
    specs: { bedrooms: 1, bathrooms: 1, sizeSqFt: '' }, // Removed default 500
    // Added Late Fee and Grace period
    financials: { monthlyRent: '', securityDeposit: '', maintenanceFee: '', lateFeeAmount: '', lateFeeGracePeriodDays: 5 },
    // Added Lease terms
    leaseTerms: { defaultDurationMonths: 12 } 
  });

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newPreviews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/property-images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.urls) {
        setImages((prev) => [...prev, ...data.urls]);
        setPreviewImages((prev) =>
          prev.map((p) =>
            newPreviews.find((n) => n.preview === p.preview)
              ? { ...p, uploading: false }
              : p
          )
        );
      }
    } catch (error) {
      alert('Image upload failed. Please try again.');
      setPreviewImages((prev) =>
        prev.filter((p) => !newPreviews.find((n) => n.preview === p.preview))
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (index) => {
    try {
      await api.delete('/upload/property-images', {
        data: { imageUrl: images[index] },
      });
    } catch (err) {
      console.error('Could not delete from Cloudinary:', err);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/properties', { ...form, images });
      router.push('/dashboard/properties');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Add New Property</h2>
        <p className="text-sm text-gray-500 mt-1">Fill in the details and lease terms to list your property.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 shadow rounded-lg">

        {/* Image Upload Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Property Photos</h3>
          <p className="text-sm text-gray-500 mb-4">Upload up to 5 photos. First photo will be the cover image.</p>

          {previewImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {previewImages.map((img, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
                  <img src={img.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  {img.uploading ? (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Cover</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {previewImages.length < 5 && (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center">
                <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB each</p>
              </div>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">Property Details</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
              <div className="flex rounded-md shadow-sm border border-gray-300 overflow-hidden">
                <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 border-r border-gray-300">
                  <Home className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Sunset Apartments Unit 4B"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="commercial">Commercial</option>
                <option value="studio">Studio</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Description</label>
            <textarea
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm resize-none"
              placeholder="Describe the property — amenities, nearby places, special features..."
              value={form.listingDescription}
              onChange={(e) => setForm({ ...form, listingDescription: e.target.value })}
            />
          </div>
        </div>

        {/* Specs & Location Area Combined for better flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Specifications</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input type="number" min="0" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.specs.bedrooms} onChange={(e) => setForm({ ...form, specs: { ...form.specs, bedrooms: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                <input type="number" min="0" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.specs.bathrooms} onChange={(e) => setForm({ ...form, specs: { ...form.specs, bathrooms: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
                <input type="number" min="0" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.specs.sizeSqFt} onChange={(e) => setForm({ ...form, specs: { ...form.specs, sizeSqFt: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input type="text" required placeholder="Street Address" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} />
              </div>
              <input type="text" required placeholder="City" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
              <input type="text" required placeholder="State / Province" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
              <div className="col-span-2">
                <input type="text" required placeholder="ZIP / Postal Code" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" value={form.address.zip} onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })} />
              </div>
            </div>
          </div>
        </div>

        {/* Financials & Lease Terms */}
        <div className="space-y-4 border-t pt-6 bg-blue-50/50 -mx-8 px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Financials & Lease Rules</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (Rs.)</label>
              <input type="number" required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="e.g. 50000" value={form.financials.monthlyRent} onChange={(e) => setForm({ ...form, financials: { ...form.financials, monthlyRent: e.target.value } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (Rs.)</label>
              <input type="number" required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="e.g. 100000" value={form.financials.securityDeposit} onChange={(e) => setForm({ ...form, financials: { ...form.financials, securityDeposit: e.target.value } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Fee (Rs.)</label>
              <input type="number" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="0" value={form.financials.maintenanceFee} onChange={(e) => setForm({ ...form, financials: { ...form.financials, maintenanceFee: e.target.value } })} />
            </div>
          </div>

          {/* New: Late Fees & Lease Year */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-2 border-t border-blue-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Amount (Rs.)</label>
              <input type="number" required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="e.g. 2000" value={form.financials.lateFeeAmount} onChange={(e) => setForm({ ...form, financials: { ...form.financials, lateFeeAmount: e.target.value } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Days)</label>
              <input type="number" required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="5" value={form.financials.lateFeeGracePeriodDays} onChange={(e) => setForm({ ...form, financials: { ...form.financials, lateFeeGracePeriodDays: e.target.value } })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard Lease (Months)</label>
              <input type="number" required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 text-sm" placeholder="12" value={form.leaseTerms.defaultDurationMonths} onChange={(e) => setForm({ ...form, leaseTerms: { defaultDurationMonths: e.target.value } })} />
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-blue-700 mt-3 bg-blue-100/50 p-2 rounded">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>These rules will automatically be applied when generating a lease agreement for this property, but you can adjust them later.</p>
          </div>
        </div>

        {/* Submit */}
        <div className="border-t pt-6 flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading || uploading} className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading images...' : 'Save Property'}
          </button>
        </div>
      </form>
    </div>
  );
}