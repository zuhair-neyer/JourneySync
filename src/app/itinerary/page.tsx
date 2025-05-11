
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit2, Trash2, Calendar, Clock, MapPin as LocationPin, Users, MessageSquare, Loader2, Info, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from 'next/image';
import type { ItineraryItem, ItineraryComment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTripContext } from '@/contexts/TripContext';
import { useToast } from '@/hooks/use-toast';
import { addItineraryItemToTripDb, getItineraryItemsForTripFromDb, updateItineraryItemInTripDb, deleteItineraryItemFromDb, addCommentToItineraryItemDb } from '@/firebase/tripService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from '@/components/ui/separator';

export default function ItineraryPage() {
  const { currentUser } = useAuth();
  const { selectedTripId, selectedTrip, userTrips, isLoadingUserTrips, setSelectedTripId } = useTripContext();
  const { toast } = useToast();

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<Omit<ItineraryItem, 'id' | 'tripId' | 'createdBy' | 'createdAt' | 'comments'>>>({
    title: '', description: '', location: '', date: '', time: '', notes: '', votes: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({}); // { itemId: commentText }
  
  const fetchTripItineraryItems = useCallback(async () => {
    if (!selectedTripId) {
      setItems([]);
      return;
    }
    setIsLoadingItems(true);
    try {
      const fetchedItems = await getItineraryItemsForTripFromDb(selectedTripId);
      setItems(fetchedItems.map(item => ({ ...item, comments: item.comments || [], votes: item.votes || 0 })));
    } catch (error) {
      console.error("Failed to fetch itinerary items:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load itinerary for this trip." });
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedTripId, toast]);

  useEffect(() => {
    fetchTripItineraryItems();
  }, [fetchTripItineraryItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!currentUser || !selectedTripId) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in and select a trip." });
      return;
    }
    if (!currentItem.title?.trim() || !currentItem.description?.trim() || !currentItem.location?.trim() || !currentItem.date?.trim() || !currentItem.time?.trim()) {
        toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in title, description, location, date, and time." });
        return;
    }

    const itemDataToSave: Omit<ItineraryItem, 'id' | 'tripId'> = {
      title: currentItem.title!,
      description: currentItem.description!,
      location: currentItem.location!,
      date: currentItem.date!,
      time: currentItem.time!,
      notes: currentItem.notes || '',
      createdBy: currentUser.uid,
      createdAt: Date.now(),
      votes: currentItem.votes || 0,
      comments: [], 
    };
    
    let success = false;
    if (editingId) {
      const updateData: Partial<Omit<ItineraryItem, 'id'|'tripId'|'createdBy'|'createdAt'|'comments'>> = {
        title: currentItem.title,
        description: currentItem.description,
        location: currentItem.location,
        date: currentItem.date,
        time: currentItem.time,
        notes: currentItem.notes,
        votes: items.find(i => i.id === editingId)?.votes || 0, 
      };
      success = await updateItineraryItemInTripDb(selectedTripId, editingId, updateData);
      if (success) toast({ title: "Success", description: "Itinerary item updated." });
    } else {
      const newItemId = await addItineraryItemToTripDb(selectedTripId, itemDataToSave);
      if (newItemId) {
          success = true;
          toast({ title: "Success", description: "Itinerary item added." });
      }
    }
    
    if (success) {
      fetchTripItineraryItems();
      setIsDialogOpen(false);
      setCurrentItem({ title: '', description: '', location: '', date: '', time: '', notes: '', votes: 0 });
      setEditingId(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Failed to ${editingId ? 'update' : 'add'} itinerary item.` });
    }
  };

  const handleEdit = (item: ItineraryItem) => {
    setCurrentItem({
      title: item.title,
      description: item.description,
      location: item.location,
      date: item.date,
      time: item.time,
      notes: item.notes,
      votes: item.votes || 0,
    });
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!selectedTripId || !currentUser) return;

    const itemToDelete = items.find(item => item.id === id);
    if (itemToDelete && itemToDelete.createdBy !== currentUser.uid) {
        toast({ variant: "destructive", title: "Error", description: "You can only delete itinerary items you created." });
        return;
    }

    const success = await deleteItineraryItemFromDb(selectedTripId, id);
    if (success) {
      toast({ title: "Success", description: "Itinerary item deleted." });
      fetchTripItineraryItems();
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete itinerary item." });
    }
  };
  
  const openNewItemDialog = () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip first to add an itinerary item." });
      return;
    }
    setCurrentItem({ title: '', description: '', location: '', date: new Date().toISOString().split('T')[0], time: '12:00', notes: '', votes: 0});
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleCommentTextChange = (itemId: string, text: string) => {
    setNewCommentTexts(prev => ({ ...prev, [itemId]: text }));
  };

  const handleAddComment = async (itemId: string) => {
    if (!currentUser || !selectedTripId) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to comment." });
      return;
    }
    const commentText = newCommentTexts[itemId]?.trim();
    if (!commentText) {
      toast({ variant: "destructive", title: "Error", description: "Comment cannot be empty." });
      return;
    }

    const newComment: Omit<ItineraryComment, 'id'> = {
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email || `User...${currentUser.uid.slice(-4)}`,
      text: commentText,
      createdAt: Date.now(),
    };
    
    const commentWithId: ItineraryComment = {
        ...newComment,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const success = await addCommentToItineraryItemDb(selectedTripId, itemId, commentWithId);

    if (success) {
      toast({ title: "Success", description: "Comment added." });
      setNewCommentTexts(prev => ({ ...prev, [itemId]: '' })); 
      fetchTripItineraryItems(); 
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to add comment." });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-primary mb-4 md:mb-0">Collaborative Itinerary</h1>
        <Button onClick={openNewItemDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!selectedTripId || isLoadingItems}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add Itinerary Item
        </Button>
      </header>

      <Card className="mb-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Select Trip for Itinerary</CardTitle>
          <CardDescription>Manage itinerary for a specific trip.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUserTrips ? (
            <p className="text-muted-foreground">Loading your trips...</p>
          ) : userTrips.length > 0 ? (
            <Select
              value={selectedTripId || ""}
              onValueChange={(value) => setSelectedTripId(value || null)}
            >
              <SelectTrigger className="w-full md:w-[300px] bg-background">
                <SelectValue placeholder="Select a trip" />
              </SelectTrigger>
              <SelectContent>
                {userTrips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground">No trips found. Please create or join a trip on the 'My Trips' page.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingId ? 'Edit' : 'Add New'} Itinerary Item for {selectedTrip?.name || "Selected Trip"}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the details for this itinerary item.' : 'Fill in the details for the new itinerary item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input name="title" placeholder="Title (e.g., Visit Eiffel Tower)" value={currentItem.title || ''} onChange={handleInputChange} className="bg-background" />
            <Textarea name="description" placeholder="Description" value={currentItem.description || ''} onChange={handleInputChange} className="bg-background"/>
            <Input name="location" placeholder="Location (e.g., Paris, France)" value={currentItem.location || ''} onChange={handleInputChange} className="bg-background"/>
            <div className="grid grid-cols-2 gap-4">
              <Input name="date" type="date" placeholder="Date" value={currentItem.date || ''} onChange={handleInputChange} className="bg-background"/>
              <Input name="time" type="time" placeholder="Time" value={currentItem.time || ''} onChange={handleInputChange} className="bg-background"/>
            </div>
            <Textarea name="notes" placeholder="Notes (optional)" value={currentItem.notes || ''} onChange={handleInputChange} className="bg-background"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingId ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!selectedTripId && !isLoadingUserTrips && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground flex items-center justify-center"><Info className="mr-2 h-8 w-8 text-primary" />No Trip Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Please select a trip from the dropdown above to view or create itinerary items.
              </CardDescription>
               <Image 
                src="https://picsum.photos/seed/select-trip-itinerary/400/250" 
                alt="Select a trip" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel map"
              />
            </CardContent>
         </Card>
      )}

      {selectedTripId && isLoadingItems && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading itinerary for {selectedTrip?.name || "trip"}...</p>
        </div>
      )}

      {selectedTripId && !isLoadingItems && items.length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">Itinerary is Empty for {selectedTrip?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Start planning your amazing trip by adding your first activity or destination!
              </CardDescription>
              <Image 
                src="https://picsum.photos/seed/empty-itinerary-trip/400/250" 
                alt="Empty Itinerary Illustration for Trip" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel planning" 
              />
            </CardContent>
         </Card>
      )}

      {selectedTripId && !isLoadingItems && items.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-primary">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
                 <p className="text-xs text-muted-foreground">
                    Created by: {selectedTrip?.members[item.createdBy]?.name || `User...${item.createdBy.slice(-4)}`} on {new Date(item.createdAt).toLocaleDateString()}
                  </p>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center"><LocationPin className="mr-2 h-4 w-4 text-accent" /> {item.location}</p>
                  <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-accent" /> {item.date}</p>
                  <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-accent" /> {item.time}</p>
                  {item.notes && <p className="italic">Notes: {item.notes}</p>}
                </div>
                
                <Separator className="my-4" />

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4 text-accent" /> Comments ({item.comments.length})
                  </h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {item.comments.length > 0 ? item.comments.map(comment => (
                      <div key={comment.id} className="text-xs p-2 rounded-md bg-secondary/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={`https://picsum.photos/seed/${comment.userId}/32/32`} alt={comment.userName} data-ai-hint="person avatar" />
                            <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">{comment.userName}</span>
                          <span className="text-muted-foreground text-xs">· {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                        <p className="text-muted-foreground pl-1">{comment.text}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newCommentTexts[item.id] || ''}
                      onChange={(e) => handleCommentTextChange(item.id, e.target.value)}
                      className="text-xs h-12 bg-background flex-grow"
                      rows={1}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleAddComment(item.id)} 
                      className="text-primary hover:text-primary/80 h-12 w-12"
                      disabled={!currentUser || !newCommentTexts[item.id]?.trim()}
                      aria-label="Add comment"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center"><Users className="mr-1 h-4 w-4" /> Votes: {item.votes || 0}</span>
                  </div>
                  <div className="mt-2 space-x-2">
                      <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10" onClick={() => toast({title: "Coming Soon", description: "Voting feature will be available soon."})}>Vote</Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                {currentUser && item.createdBy === currentUser.uid && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

