
"use client";

import React, { useEffect, useState } from 'react'; 
import { useTripContext } from '@/contexts/TripContext';
import { useAuth } from '@/contexts/AuthContext';
import { TripCard } from './TripCard';
import { EditTripNameDialog } from './EditTripNameDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; 
import Image from 'next/image';
import { AlertTriangle, Edit, LayoutDashboard, Trash2, Loader2 } from 'lucide-react'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface EditingTripDetails {
  id: string;
  name: string;
  memberUids: string[];
}

export function TripList() {
  const { 
    userTrips, 
    isLoadingUserTrips, 
    selectedTrip, 
    isLoadingSelectedTrip, 
    selectedTripId, 
    setSelectedTripId, 
    errorUserTrips,
    errorSelectedTrip,
    deleteTrip 
  } = useTripContext();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [isEditTripNameDialogOpen, setIsEditTripNameDialogOpen] = useState(false);
  const [editingTripDetails, setEditingTripDetails] = useState<EditingTripDetails | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);


  useEffect(() => {
    if (selectedTripId && !isLoadingUserTrips) {
      // The TripContext's useEffect for selectedTripId changing or displayName changing
      // should handle refreshing the selected trip details.
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

  const handleOpenEditDialog = () => {
    if (selectedTrip) {
      setEditingTripDetails({
        id: selectedTrip.id,
        name: selectedTrip.name,
        memberUids: Object.keys(selectedTrip.members || {}),
      });
      setIsEditTripNameDialogOpen(true);
    }
  };

  const handleConfirmDeleteTrip = async () => {
    if (!selectedTrip) return;
    setIsDeletingTrip(true);
    const success = await deleteTrip(selectedTrip.id, Object.keys(selectedTrip.members || {}));
    setIsDeletingTrip(false);
    if (success) {
      toast({ title: "Trip Deleted", description: `Trip "${selectedTrip.name}" has been deleted.` });
      // Context update (clearing selectedTripId if it was deleted) handled by deleteTrip in context
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete trip." });
    }
    setDeleteConfirmationOpen(false);
  };

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
                        <li key={member.uid}>{member.name || `User...${member.uid.substring(member.uid.length - 4)}`}</li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No members listed for this trip yet.</p>
                )}
                 <p className="mt-4 text-xs text-muted-foreground">
                    Further trip details (itinerary, expenses, etc.) are available on the Trip Dashboard.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Trip details not found for ID: {selectedTripId}. It might have been deleted or the ID is incorrect.
              </p>
            )}
          </CardContent>
          {selectedTrip && !isLoadingSelectedTrip && !errorSelectedTrip && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t gap-3">
              <div className="flex-grow">
                <p className="text-xs text-muted-foreground">
                    Created by: {selectedTrip.members[selectedTrip.createdBy]?.name || `User...${selectedTrip.createdBy.substring(selectedTrip.createdBy.length-4)}`} on {new Date(selectedTrip.createdAt).toLocaleDateString()}
                </p>
                 <Link href="/trip-dashboard" passHref>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary hover:text-primary/80">
                        <LayoutDashboard className="mr-1 h-3 w-3" /> View Full Dashboard
                    </Button>
                </Link>
              </div>
              {currentUser?.uid === selectedTrip.createdBy && (
                <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center w-full sm:w-auto">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEditDialog}
                      className="w-full sm:w-auto"
                  >
                      <Edit className="mr-2 h-4 w-4" /> Edit Name
                  </Button>
                  <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={isDeletingTrip}
                      >
                        {isDeletingTrip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Trip
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the trip
                          "{selectedTrip?.name}" and all its associated data (expenses, itinerary, polls, etc.)
                          for all members.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingTrip}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleConfirmDeleteTrip}
                          disabled={isDeletingTrip}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          {isDeletingTrip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, delete trip"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      )}
      {editingTripDetails && (
        <EditTripNameDialog
          tripId={editingTripDetails.id}
          currentTripName={editingTripDetails.name}
          memberUids={editingTripDetails.memberUids}
          isOpen={isEditTripNameDialogOpen}
          onOpenChange={setIsEditTripNameDialogOpen}
        />
      )}
    </div>
  );
}

