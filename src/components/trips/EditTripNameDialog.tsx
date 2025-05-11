
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { updateTripNameInDb } from '@/firebase/tripService';
import { useTripContext } from '@/contexts/TripContext';
import { Loader2 } from 'lucide-react';

interface EditTripNameDialogProps {
  tripId: string;
  currentTripName: string;
  memberUids: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditTripNameDialog({ tripId, currentTripName, memberUids, isOpen, onOpenChange }: EditTripNameDialogProps) {
  const [newTripName, setNewTripName] = useState(currentTripName);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUserTrips, refreshSelectedTripDetails } = useTripContext();

  useEffect(() => {
    // Reset newTripName if dialog is reopened with a different trip or current name changes
    if (isOpen) {
      setNewTripName(currentTripName);
    }
  }, [isOpen, currentTripName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Trip name cannot be empty." });
      return;
    }
    if (newTripName.trim() === currentTripName) {
      toast({ variant: "default", title: "No Change", description: "New trip name is the same as the current one." });
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    const success = await updateTripNameInDb(tripId, newTripName.trim(), memberUids);
    setIsLoading(false);

    if (success) {
      toast({ title: "Success!", description: "Trip name updated." });
      refreshUserTrips(); // Refreshes the list of trips
      refreshSelectedTripDetails(); // Refreshes the details of the currently selected trip
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to update trip name. Please try again." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-primary">Edit Trip Name</DialogTitle>
          <DialogDescription>
            Change the name of your trip. This will be updated for all members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trip-name" className="text-right col-span-1">
                Name
              </Label>
              <Input
                id="edit-trip-name"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                className="col-span-3 bg-background"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !newTripName.trim() || newTripName.trim() === currentTripName}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
