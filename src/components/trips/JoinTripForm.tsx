"use client";

import React, { useState, useEffect } from 'react'; 
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

  useEffect(() => {
    if (currentUser) {
      console.log("[JoinTripForm] useEffect: currentUser state updated. UID:", currentUser.uid, "Display Name:", currentUser.displayName, "Email:", currentUser.email);
    } else {
      console.log("[JoinTripForm] useEffect: currentUser is null.");
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[JoinTripForm] handleSubmit triggered.");

    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to join a trip." });
      console.error("[JoinTripForm] handleSubmit: currentUser is null. Cannot proceed.");
      return;
    }

    console.log("[JoinTripForm] handleSubmit: CurrentUser object at submission:", 
      JSON.stringify({ 
        uid: currentUser.uid, 
        displayName: currentUser.displayName, 
        email: currentUser.email,
        emailVerified: currentUser.emailVerified 
      })
    );

    if (!currentUser.displayName || currentUser.displayName.trim() === "") {
      toast({ 
        variant: "destructive", 
        title: "Display Name Not Set", 
        description: "Your display name might still be syncing or is not set. Please wait a moment, ensure it's set in your account settings, and try again." 
      });
      console.error("[JoinTripForm] handleSubmit: currentUser.displayName is missing or empty. displayName value:", `"${currentUser.displayName}"`);
      setIsLoading(false);
      return;
    }
    if (!tripId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Trip ID cannot be empty." });
      console.error("[JoinTripForm] handleSubmit: Trip ID is empty.");
      return;
    }

    setIsLoading(true);
    const basicUserInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName, 
      email: currentUser.email,
    };
    console.log("[JoinTripForm] handleSubmit: Prepared basicUserInfo to send to joinTripInDb:", JSON.stringify(basicUserInfo));

    const success = await joinTripInDb(tripId, basicUserInfo);
    setIsLoading(false);

    if (success) {
      toast({ title: "Success!", description: "You've joined the trip." });
      setTripId('');
      refreshUserTrips();
      console.log("[JoinTripForm] handleSubmit: Successfully joined trip. Trip ID:", tripId);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to join trip. Please check the ID or server logs." });
      console.error("[JoinTripForm] Client-side: joinTripInDb returned false. This may indicate the trip ID doesn't exist, user is already a member, or a server-side Firebase error (e.g., permission denied, misconfiguration). Check Next.js server console logs for 'tripService.ts' messages.");
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
          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" 
            disabled={isLoading || !currentUser || !currentUser.displayName || currentUser.displayName.trim() === ""}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Join Trip
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
