"use client";

import React, { useEffect } from 'react'; // Added useEffect
import { useTripContext } from '@/contexts/TripContext';
import { TripCard } from './TripCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';

export function TripList() {
  const { 
    userTrips, 
    isLoadingUserTrips, 
    selectedTrip, 
    isLoadingSelectedTrip, 
    selectedTripId, 
    setSelectedTripId, // To refresh selected trip if needed
    errorUserTrips,
    errorSelectedTrip 
  } = useTripContext();

  // Effect to re-fetch selected trip details if the selectedTripId is already set
  // and userTrips (which might trigger this component to update) changes.
  // This helps if a trip name was updated by another action.
  useEffect(() => {
    if (selectedTripId && !isLoadingUserTrips) {
      // Trigger a re-fetch of the selected trip to get latest details
      // This is a bit of a trick: setting it to null then back to the ID
      // can trigger the fetch logic in TripContext if dependencies are set up correctly.
      // A more direct refreshSelectedTrip() function in context would be cleaner.
      // For now, let's rely on TripContext's useEffect for selectedTripId.
      // If the name changed in the list, the TripCard itself will show the new name.
      // This is more about the detailed "Selected Trip" view.
      // A simple way to force re-fetch of selected trip details:
      // setSelectedTripId(null); // This will clear it
      // setTimeout(() => setSelectedTripId(selectedTripId), 0); // Then set it back
      // However, a direct refresh function in context is better.
      // For now, if a displayName update happened, AuthContext update should trigger TripContext,
      // which should refetch selectedTrip.
    }
  }, [userTrips, selectedTripId, isLoadingUserTrips, setSelectedTripId]);


  if (isLoadingUserTrips) {
    return (
      <div className="mt-6">
        <h2 className="text-2xl font-semibold text-primary mb-4">Loading Your Trips...</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (errorUserTrips) {
    return (
      <Card className="mt-6 text-center p-8 shadow-md bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive-foreground flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 mr-2" /> Error Loading Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-destructive-foreground/80">
            We couldn't load your trips. Please try again later.
          </CardDescription>
          <p className="text-xs text-destructive-foreground/70 mt-2">{errorUserTrips}</p>
        </CardContent>
      </Card>
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
    <div className="space-y-8 mt-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary mb-4">Your Trips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTrips.map(tripInfo => (
            <TripCard key={tripInfo.id} tripInfo={tripInfo} />
          ))}
        </div>
      </div>

      {selectedTripId && ( 
        <Card className="mt-8 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-primary">
              Selected Trip: {isLoadingSelectedTrip ? "Loading..." : (selectedTrip?.name || "Details")}
            </CardTitle>
            <CardDescription>ID: {selectedTripId}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSelectedTrip ? (
              <>
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3 mt-1" />
              </>
            ) : errorSelectedTrip ? (
              <div className="text-destructive flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2"/> Could not load trip details: {errorSelectedTrip}
              </div>
            ) : selectedTrip ? (
              <>
                <h3 className="font-semibold mb-2 text-foreground">Members:</h3>
                {selectedTrip.members && Object.keys(selectedTrip.members).length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {Object.values(selectedTrip.members).map(member => {
                      console.log("[TripList] Displaying member:", JSON.stringify(member));
                      return (
                        <li key={member.uid}>{member.name || member.email || `User ${member.uid.substring(0,5)}...`}</li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No members listed for this trip yet.</p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Created by: {selectedTrip.createdBy} on {new Date(selectedTrip.createdAt).toLocaleDateString()}
                </p>
                 <p className="mt-4 text-xs text-muted-foreground">
                    Further trip details (itinerary, expenses, etc.) would be shown here or on a dedicated trip dashboard page.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Trip details not found for ID: {selectedTripId}. It might have been deleted or the ID is incorrect.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
