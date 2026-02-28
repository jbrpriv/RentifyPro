'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Building2, Search, Home, Bed, Bath } from 'lucide-react';
import Navbar from '@/components/Navbar'; // <-- Imported Navbar
import Footer from '@/components/Footer'; // <-- Imported Footer

export default function BrowsePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', type: '', maxRent: '' });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.type) params.append('type', filters.type);
      if (filters.maxRent) params.append('maxRent', filters.maxRent);

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* 1. Added Navbar */}
      <Navbar />

      {/* Main Content Wrapper - Added pt-16 to account for fixed navbar */}
      <main className="flex-grow pt-16">
        
        {/* Hero Header */}
        <div className="bg-blue-600 py-14 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Find Your Next Home</h1>
            <p className="text-blue-100 mb-8 text-lg">Browse verified rental properties across Pakistan</p>

            {/* Search Bar */}
            <div className="bg-white rounded-xl p-3 flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto shadow-xl">
              <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-3">
                <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="City (e.g. Mardan, Lahore, Karachi)"
                  className="w-full py-2 text-sm focus:outline-none"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && fetchListings()}
                />
              </div>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="commercial">Commercial</option>
                <option value="studio">Studio</option>
              </select>
              <input
                type="number"
                placeholder="Max Rent (Rs.)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none w-36"
                value={filters.maxRent}
                onChange={(e) => setFilters({ ...filters, maxRent: e.target.value })}
              />
              <button
                onClick={fetchListings}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="max-w-5xl mx-auto px-4 py-10">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <Home className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 font-medium text-gray-600">No listings found</p>
              <p className="text-sm text-gray-400">Try adjusting your search filters</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">{listings.length} propert{listings.length === 1 ? 'y' : 'ies'} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Link key={listing._id} href={`/browse/${listing._id}`}>
                    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden group">

                      {/* Cover Image */}
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <Building2 className="h-16 w-16 text-blue-200" />
                          </div>
                        )}
                        {/* Type Badge */}
                        <span className="absolute top-3 left-3 px-2 py-1 bg-white bg-opacity-90 text-gray-700 text-xs font-medium rounded-full capitalize shadow-sm">
                          {listing.type}
                        </span>
                        {/* Image count badge */}
                        {listing.images && listing.images.length > 1 && (
                          <span className="absolute bottom-3 right-3 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded-full">
                            +{listing.images.length - 1} photos
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {listing.title}
                        </h3>
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          {listing.address?.city}, {listing.address?.state}
                        </div>

                        {/* Description snippet */}
                        {listing.listingDescription && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                            {listing.listingDescription}
                          </p>
                        )}

                        {/* Specs row */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          {listing.specs?.bedrooms != null && (
                            <span className="flex items-center">
                              <Bed className="h-3 w-3 mr-1" />{listing.specs.bedrooms} bed
                            </span>
                          )}
                          {listing.specs?.bathrooms != null && (
                            <span className="flex items-center">
                              <Bath className="h-3 w-3 mr-1" />{listing.specs.bathrooms} bath
                            </span>
                          )}
                          {listing.specs?.sizeSqFt && (
                            <span>{listing.specs.sizeSqFt} sq ft</span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div>
                            <span className="text-lg font-bold text-blue-600">
                              Rs. {listing.financials?.monthlyRent?.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400">/month</span>
                          </div>
                          <span className="text-xs text-blue-600 font-medium group-hover:underline">
                            View details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* 2. Added Footer */}
      <Footer />

    </div>
  );
}