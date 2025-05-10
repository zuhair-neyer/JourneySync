
"use client";

import React from 'react';
import { useTripContext } from '@/contexts/TripContext';
import { TripCard } from './TripCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

export function TripList() {
  const { userTrips, isLoadingUserTrips, selectedTrip, isLoadingSelectedTrip } = useTripContext();

  if (isLoadingUserTrips) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (userTrips.length === 0) {
    return (
      <Card className="mt-6 text-center p-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-2xl text-muted-foreground">No Trips Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            Create a new trip or join an existing one to start planning!
          </CardDescription>
          <Image 
            src="https://picsum.photos/seed/no-trips/400/250" 
            alt="No trips illustration" 
            width={400} 
            height={250} 
            className="mx-auto rounded-lg shadow-sm"
            data-ai-hint="adventure map"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-primary mb-4">Your Trips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTrips.map(tripInfo => (
            <TripCard key={tripInfo.id} tripInfo={tripInfo} />
          ))}
        </div>
      </div>

      {selectedTrip && (
        <Card className="mt-8 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Selected Trip: {selectedTrip.name}</CardTitle>
            <CardDescription>ID: {selectedTrip.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">Members:</h3>
            {isLoadingSelectedTrip ? (
              <Skeleton className="h-5 w-1/2" />
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {selectedTrip.members && Object.values(selectedTrip.members).map(member => (
                  <li key={member.uid}>{member.name || member.email}</li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Further trip details (itinerary, expenses, etc.) would be shown here or on a dedicated trip dashboard page.
            </p>
          </CardContent>
        </Card>
      )}
       {selectedTripId && !selectedTrip && !isLoadingSelectedTrip && (
         <Card className="mt-8 shadow-lg bg-card">
            <CardHeader>
                <CardTitle className="text-xl text-destructive">Error Loading Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Could not load details for the selected trip. It might have been deleted or there was a network issue.</p>
            </CardContent>
         </Card>
       )}
    </div>
  );
}
