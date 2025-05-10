
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CreateTripForm } from '@/components/trips/CreateTripForm';
import { JoinTripForm } from '@/components/trips/JoinTripForm';
import { TripList } from '@/components/trips/TripList';
import { PlaneTakeoff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function TripsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || !currentUser) {
    // You can show a loading spinner here
    return (
      <div className="flex items-center justify-center min-h-screen">
        <PlaneTakeoff className="h-16 w-16 animate-pulse text-primary" />
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
