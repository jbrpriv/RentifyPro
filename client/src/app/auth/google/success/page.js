'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GoogleOAuthSuccessPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  useEffect(() => {
    const token           = searchParams.get('token');
    const name            = searchParams.get('name');
    const role            = searchParams.get('role');
    const id              = searchParams.get('id');
    const email           = searchParams.get('email');
    const profileComplete = searchParams.get('profileComplete') === 'true';
    const isPhoneVerified = searchParams.get('isPhoneVerified') === 'true';

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('userInfo', JSON.stringify({ _id: id, name, role, email, isPhoneVerified }));

      // If profile is not complete (new Google user), redirect to complete profile
      if (!profileComplete) {
        router.replace('/auth/google/complete-profile');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      <p className="text-gray-500 font-medium">Signing you in with Google…</p>
    </div>
  );
}
