'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, CreditCard, ShieldCheck, CheckCircle2, LayoutDashboard, Building2, Users, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-grow pt-28">
        {/* Hero Section */}
        <section className="pb-16 sm:pb-24 lg:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob animation-delay-2000"></div>

            <div className="text-center max-w-4xl mx-auto relative z-10">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 tracking-tight mb-8">
                Seamless renting for modern <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Landlords & Tenants</span>
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto font-medium">
                RentifyPro automates your leases, tracks digital rent payments, and connects verified tenants with top-tier properties.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/browse" 
                  className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-0.5"
                >
                  Browse Properties <ArrowRight className="ml-2 h-5 w-5" />
                </Link>

                {user ? (
                  <Link 
                    href="/dashboard" 
                    className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 text-base font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-2xl transition-all shadow-sm"
                  >
                    <LayoutDashboard className="mr-2 h-5 w-5" /> Go to Dashboard
                  </Link>
                ) : (
                  <Link 
                    href="/register" 
                    className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 text-base font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl shadow-sm transition-all"
                  >
                    Create an Account
                  </Link>
                )}
              </div>
              
              <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-400 font-bold uppercase tracking-widest">
                <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/> Digital Leases</span>
                <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/> Stripe Payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section id="features" className="py-24 bg-gray-50 border-y border-gray-100 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Powerful Features</h2>
              <p className="text-gray-500 font-medium">Everything you need to manage the rental lifecycle.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-blue-100 p-3 rounded-2xl w-fit mb-6"><FileText className="text-blue-600 w-6 h-6"/></div>
                <h3 className="font-bold text-xl mb-3">Smart Agreements</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Auto-generate legally binding digital leases that both parties can sign securely from any device.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-green-100 p-3 rounded-2xl w-fit mb-6"><CreditCard className="text-green-600 w-6 h-6"/></div>
                <h3 className="font-bold text-xl mb-3">Automated Payments</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Integrated Stripe payments for security deposits and monthly rent with automated receipts and history.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="bg-purple-100 p-3 rounded-2xl w-fit mb-6"><Users className="text-purple-600 w-6 h-6"/></div>
                <h3 className="font-bold text-xl mb-3">Tenant Screening</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Manage applications in a centralized inbox. Review messages, profiles, and approve with one click.</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- ABOUT SECTION --- */}
        <section id="how-it-works" className="py-24 bg-white scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">Modernizing the way <br/> Pakistan rents.</h2>
                <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                  RentifyPro was built to bridge the gap between landlords and tenants. By digitizing paperwork and payments, we create a transparent, stress-free environment for property management.
                </p>
                <div className="space-y-4">
                  {[
                    "Verified Property Listings",
                    "Real-time Application Tracking",
                    "Automated 12-Month Rent Schedules",
                    "Secure Cloud Document Storage"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="bg-blue-600 rounded-full p-1"><CheckCircle2 className="text-white w-4 h-4"/></div>
                      <span className="font-bold text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2 w-full bg-gray-50 rounded-[3rem] p-12 border border-gray-100 relative">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 transform -rotate-2">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Building2/></div>
                    <div>
                      <p className="font-bold text-gray-900">Grand Regency Apt.</p>
                      <p className="text-xs text-gray-400">Islamabad, Sector F-10</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full w-full mb-2"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-3/4"></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 absolute bottom-8 right-8 transform rotate-3">
                  <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-widest">Lease Status</p>
                  <p className="font-black text-gray-900">Active & Paid</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {!user && (
        <section className="bg-blue-900 py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to simplify your rental process?</h2>
            <Link href="/register" className="inline-block px-10 py-4 bg-white text-blue-900 font-black rounded-2xl shadow-xl hover:bg-gray-50 transition-colors">
              Get Started for Free
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}