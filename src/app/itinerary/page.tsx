"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit2, Trash2, Calendar, Clock, MapPin as LocationPin, Users, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from 'next/image';

interface ItineraryItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  notes?: string;
  votes?: number;
  comments?: string[];
}

export default function ItineraryPage() {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ItineraryItem>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Effect to prevent hydration mismatch for initial items or dialog state
  useEffect(() => {
    // Load items from localStorage or API if needed
    const initialItems: ItineraryItem[] = [
      { id: '1', title: 'Visit Eiffel Tower', description: 'Iconic landmark visit', location: 'Paris, France', date: '2024-08-15', time: '10:00', notes: 'Book tickets online', votes: 5, comments: ['Sounds great!'] },
      { id: '2', title: 'Louvre Museum Tour', description: 'Explore art collections', location: 'Paris, France', date: '2024-08-15', time: '14:00', notes: 'Focus on key exhibits', votes: 3, comments: [] },
    ];
    setItems(initialItems);
  }, []);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (editingId) {
      setItems(items.map(item => item.id === editingId ? { ...item, ...currentItem } as ItineraryItem : item));
    } else {
      setItems([...items, { ...currentItem, id: Date.now().toString(), votes:0, comments: [] } as ItineraryItem]);
    }
    setIsDialogOpen(false);
    setCurrentItem({});
    setEditingId(null);
  };

  const handleEdit = (item: ItineraryItem) => {
    setCurrentItem(item);
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const openNewItemDialog = () => {
    setCurrentItem({});
    setEditingId(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-primary mb-4 md:mb-0">Collaborative Itinerary</h1>
        <Button onClick={openNewItemDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Itinerary Item
        </Button>
      </header>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingId ? 'Edit' : 'Add New'} Itinerary Item</DialogTitle>
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

      {items.length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">Your Itinerary is Empty</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Start planning your amazing trip by adding your first activity or destination!
              </CardDescription>
              <Image 
                src="https://picsum.photos/seed/empty-itinerary/400/250" 
                alt="Empty Itinerary Illustration" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel planning" 
              />
            </CardContent>
         </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-primary">{item.title}</CardTitle>
                <Image 
                  src={`https://picsum.photos/seed/${item.id}/100/75`} 
                  alt={item.title}
                  width={100} 
                  height={75} 
                  className="rounded-md object-cover"
                  data-ai-hint="landmark travel"
                />
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center"><LocationPin className="mr-2 h-4 w-4 text-accent" /> {item.location}</p>
                <p className="flex items-center"><Calendar className="mr-2 h-4 w-4 text-accent" /> {item.date}</p>
                <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-accent" /> {item.time}</p>
                {item.notes && <p className="italic">Notes: {item.notes}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center"><Users className="mr-1 h-4 w-4" /> Votes: {item.votes || 0}</span>
                    <span className="flex items-center"><MessageSquare className="mr-1 h-4 w-4" /> Comments: {item.comments?.length || 0}</span>
                </div>
                <div className="mt-2 space-x-2">
                    <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">Vote</Button>
                    <Button variant="outline" size="sm">Comment</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-muted-foreground hover:text-primary">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
