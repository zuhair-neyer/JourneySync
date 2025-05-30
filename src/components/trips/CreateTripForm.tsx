"use client";

import React, { useState, useEffect } from 'react'; 
import { useAuth } from '@/contexts/AuthContext';
import { createTripInDb } from '@/firebase/tripService';
import { useTripContext } from '@/contexts/TripContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Copy } from 'lucide-react';

export function CreateTripForm() {
  const { currentUser } = useAuth();
  const { refreshUserTrips } = useTripContext();
  const [tripName, setTripName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      console.log("[CreateTripForm] useEffect: currentUser state updated. UID:", currentUser.uid, "Display Name:", currentUser.displayName, "Email:", currentUser.email);
    } else {
      console.log("[CreateTripForm] useEffect: currentUser is null.");
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[CreateTripForm] handleSubmit triggered.");

    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to create a trip." });
      console.error("[CreateTripForm] handleSubmit: currentUser is null. Cannot proceed.");
      return;
    }
    
    console.log("[CreateTripForm] handleSubmit: CurrentUser object at submission:", 
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
      console.error("[CreateTripForm] handleSubmit: currentUser.displayName is missing or empty. displayName value:", `"${currentUser.displayName}"`);
      setIsLoading(false);
      return;
    }
    if (!tripName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Trip name cannot be empty." });
      console.error("[CreateTripForm] handleSubmit: Trip name is empty.");
      return;
    }

    setIsLoading(true);
    setCreatedTripId(null);

    const basicUserInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName, 
      email: currentUser.email,
    };
    console.log("[CreateTripForm] handleSubmit: Prepared basicUserInfo to send to createTripInDb:", JSON.stringify(basicUserInfo));

    const newTripId = await createTripInDb(tripName, basicUserInfo);
    setIsLoading(false);

    if (newTripId) {
      toast({ title: "Success!", description: `Trip "${tripName}" created. Share the ID with others to join!` });
      setCreatedTripId(newTripId);
      setTripName('');
      refreshUserTrips();
      console.log("[CreateTripForm] handleSubmit: Trip creation successful. New Trip ID:", newTripId);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to create trip. Please check server logs for details." });
      console.error("[CreateTripForm] Client-side: createTripInDb returned null. This usually indicates a server-side error with Firebase (e.g., permission denied, misconfiguration). Check your Next.js server console logs for detailed Firebase error messages from 'tripService.ts'.");
    }
  };

  const handleCopyTripId = () => {
    if (createdTripId) {
      navigator.clipboard.writeText(createdTripId)
        .then(() => toast({ description: "Trip ID copied to clipboard!" }))
        .catch(() => toast({ variant: "destructive", description: "Failed to copy Trip ID." }));
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Create a New Trip</CardTitle>
        <CardDescription>Start planning your next adventure by creating a new trip.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tripName">Trip Name</Label>
            <Input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Summer Vacation in Italy"
              className="bg-background"
              disabled={isLoading}
            />
          </div>
          {createdTripId && (
            <div className="p-3 border rounded-md bg-secondary">
              <p className="text-sm text-muted-foreground">Trip Created! Share this ID:</p>
              <div className="flex items-center gap-2 mt-1">
                <Input type="text" value={createdTripId} readOnly className="bg-background font-mono text-sm" />
                <Button type="button" size="icon" variant="outline" onClick={handleCopyTripId} aria-label="Copy Trip ID">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={isLoading || !currentUser || !currentUser.displayName || currentUser.displayName.trim() === ""}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Create Trip
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
