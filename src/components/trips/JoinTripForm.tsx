"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { joinTripInDb } from '@/firebase/tripService';
import { useTripContext } from '@/contexts/TripContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';

export function JoinTripForm() {
  const { currentUser } = useAuth();
  const { refreshUserTrips } = useTripContext();
  const [tripId, setTripId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to join a trip." });
      return;
    }
    if (!tripId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Trip ID cannot be empty." });
      return;
    }

    setIsLoading(true);
    const basicUserInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      email: currentUser.email,
    };
    const success = await joinTripInDb(tripId, basicUserInfo);
    setIsLoading(false);

    if (success) {
      toast({ title: "Success!", description: "You've joined the trip." });
      setTripId('');
      refreshUserTrips();
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to join trip. Please check the ID or try again." });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Join an Existing Trip</CardTitle>
        <CardDescription>Enter the Trip ID provided by the creator to join their adventure.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="joinTripId">Trip ID</Label>
            <Input
              id="joinTripId"
              type="text"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              placeholder="Enter Trip ID"
              className="bg-background"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Join Trip
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}