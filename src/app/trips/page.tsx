"use client";

import React, { useEffect, useState } from 'react'; // Added useState
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CreateTripForm } from '@/components/trips/CreateTripForm';
import { JoinTripForm } from '@/components/trips/JoinTripForm';
import { TripList } from '@/components/trips/TripList';
import { PlaneTakeoff, Loader2 } from 'lucide-react'; // Added Loader2 for more specific loading
import { Separator } from '@/components/ui/separator';

export default function TripsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false); // Flag to prevent redirect loop

  useEffect(() => {
    // Only attempt to redirect if auth is not loading, user is not present, and not already redirecting
    if (!authLoading && !currentUser && !isRedirecting) {
      setIsRedirecting(true); // Set flag to true before pushing
      router.push('/login');
    }
    // If user becomes authenticated while redirect was flagged, reset flag
    if (currentUser && isRedirecting) {
      setIsRedirecting(false);
    }
  }, [currentUser, authLoading, router, isRedirecting]);

  // Show a loading indicator while auth state is loading or if a redirect is in progress
  if (authLoading || (!currentUser && !isRedirecting) || (isRedirecting && !currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-primary">
        <Loader2 className="h-16 w-16 animate-spin mb-4" />
        <p>Loading user session...</p>
      </div>
    );
  }
  
  // If after loading, there's still no current user, and we are not in a redirect state (e.g. effect hasn't run yet)
  // This case should ideally be caught by the useEffect, but as a fallback:
  if (!currentUser) {
     // This state should ideally be brief and handled by the useEffect redirect.
     // If it persists, it might indicate an issue with the auth flow.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-primary">
        <Loader2 className="h-16 w-16 animate-spin mb-4" />
        <p>Redirecting to login...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <PlaneTakeoff className="w-16 h-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary">Manage Your Trips</h1>
        <p className="text-muted-foreground">Create new adventures or join existing ones.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <CreateTripForm />
        <JoinTripForm />
      </div>

      <Separator className="my-12" />
      
      <TripList />
    </div>
  );
}

