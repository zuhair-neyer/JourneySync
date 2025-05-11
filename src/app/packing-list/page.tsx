
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Edit2, Sparkles, Sun, CloudRain, Snowflake, Luggage, Info, Loader2 } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PackingItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTripContext } from '@/contexts/TripContext';
import { useToast } from '@/hooks/use-toast';
import {
  addPackingItemToTripDb,
  getPackingListForTripFromDb,
  updatePackingItemInTripDb,
  deletePackingItemFromTripDb,
} from '@/firebase/tripService';

const initialCategories = ["Clothes", "Toiletries", "Documents", "Electronics", "Medication", "Miscellaneous", "Accessories"];

export default function PackingListPage() {
  const { currentUser } = useAuth();
  const { selectedTripId, selectedTrip, userTrips, isLoadingUserTrips, setSelectedTripId } = useTripContext();
  const { toast } = useToast();

  const [items, setItems] = useState<PackingItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(initialCategories[5]); // Default to Miscellaneous
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);

  const fetchTripPackingList = useCallback(async () => {
    if (!selectedTripId) {
      setItems([]);
      return;
    }
    setIsLoadingItems(true);
    try {
      const fetchedItems = await getPackingListForTripFromDb(selectedTripId);
      setItems(fetchedItems);
    } catch (error) {
      console.error("Failed to fetch packing list:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load packing list for this trip." });
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedTripId, toast]);

  useEffect(() => {
    fetchTripPackingList();
  }, [fetchTripPackingList]);

  const handleAddItem = async () => {
    if (!selectedTripId || !currentUser) {
      toast({ variant: "destructive", title: "Error", description: "Please select a trip and be logged in." });
      return;
    }
    if (newItemName.trim() === '') {
      toast({ variant: "destructive", title: "Error", description: "Item name cannot be empty." });
      return;
    }

    let success = false;
    if (editingItem) {
      const itemDataToUpdate: Partial<Omit<PackingItem, 'id'>> = {
        name: newItemName,
        category: newItemCategory,
        // packed status is toggled separately
      };
      success = await updatePackingItemInTripDb(selectedTripId, editingItem.id, itemDataToUpdate);
      if (success) toast({ title: "Success", description: "Item updated." });
      setEditingItem(null);
    } else {
      const itemDataToAdd: Omit<PackingItem, 'id'> = {
        name: newItemName,
        packed: false,
        category: newItemCategory,
      };
      const newItemId = await addPackingItemToTripDb(selectedTripId, itemDataToAdd);
      if (newItemId) {
        success = true;
        toast({ title: "Success", description: "Item added." });
      }
    }

    if (success) {
      fetchTripPackingList();
      setNewItemName('');
      setNewItemCategory(initialCategories[5]); // Reset to Miscellaneous
    } else {
      toast({ variant: "destructive", title: "Error", description: `Failed to ${editingItem ? 'update' : 'add'} item.` });
    }
  };

  const handleTogglePacked = async (id: string, currentPackedStatus: boolean) => {
    if (!selectedTripId) return;
    const success = await updatePackingItemInTripDb(selectedTripId, id, { packed: !currentPackedStatus });
    if (success) {
      fetchTripPackingList();
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to update packed status." });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!selectedTripId) return;
    const success = await deletePackingItemFromTripDb(selectedTripId, id);
    if (success) {
      toast({ title: "Success", description: "Item deleted." });
      fetchTripPackingList();
      if (editingItem?.id === id) {
        setEditingItem(null);
        setNewItemName('');
        setNewItemCategory(initialCategories[5]);
      }
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
    }
  };

  const handleEditItem = (item: PackingItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemCategory(item.category);
  };

  const handleSuggestItems = async (weather: 'Sunny' | 'Rainy' | 'Cold') => {
    if (!selectedTripId || !currentUser) {
      toast({ variant: "destructive", title: "Select Trip", description: "Please select a trip to add suggested items." });
      return;
    }

    let suggestions: Omit<PackingItem, 'id'>[] = [];
    if (weather === 'Sunny') {
      suggestions = [
        { name: 'Sunscreen', packed: false, category: 'Toiletries' },
        { name: 'Sunglasses', packed: false, category: 'Accessories' },
        { name: 'Hat', packed: false, category: 'Clothes' },
      ];
    } else if (weather === 'Rainy') {
      suggestions = [
        { name: 'Umbrella', packed: false, category: 'Accessories' },
        { name: 'Raincoat', packed: false, category: 'Clothes' },
      ];
    } else if (weather === 'Cold') {
      suggestions = [
        { name: 'Warm Jacket', packed: false, category: 'Clothes' },
        { name: 'Gloves', packed: false, category: 'Clothes' },
        { name: 'Scarf', packed: false, category: 'Clothes' },
      ];
    }

    let itemsAddedCount = 0;
    for (const sugg of suggestions) {
      // Check if item already exists (case-insensitive)
      if (!items.find(item => item.name.toLowerCase() === sugg.name.toLowerCase())) {
        const newItemId = await addPackingItemToTripDb(selectedTripId, sugg);
        if (newItemId) itemsAddedCount++;
      }
    }

    if (itemsAddedCount > 0) {
      toast({ title: "Suggestions Added", description: `${itemsAddedCount} item(s) added to your list for ${selectedTrip?.name}.` });
      fetchTripPackingList();
    } else {
      toast({ description: "Suggested items might already be on your list or couldn't be added." });
    }
  };

  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Miscellaneous';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);
  
  // Sort categories: put initialCategories first, then others alphabetically
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const aIndex = initialCategories.indexOf(a);
    const bIndex = initialCategories.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <Luggage className="w-16 h-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary">Packing Checklist for {selectedTrip?.name || "Your Trip"}</h1>
        <p className="text-muted-foreground">Get ready for your adventure! Don't forget anything important.</p>
      </header>

      <Card className="mb-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Select Trip for Packing List</CardTitle>
          <CardDescription>Manage packing list for a specific trip.</CardDescription>
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

      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader>
          <CardTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              placeholder="e.g., Sunscreen, Passport"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-grow bg-background"
              disabled={!selectedTripId || isLoadingItems}
            />
            <Select 
              value={newItemCategory} 
              onValueChange={setNewItemCategory}
              disabled={!selectedTripId || isLoadingItems}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {initialCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div className="flex gap-2">
            <Button onClick={handleAddItem} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!selectedTripId || isLoadingItems || !newItemName.trim()}>
              {editingItem ? <Edit2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {editingItem ? 'Update' : 'Add'}
            </Button>
            {editingItem && <Button variant="outline" onClick={() => { setEditingItem(null); setNewItemName(''); setNewItemCategory(initialCategories[5]); }}>Cancel Edit</Button>}
           </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" />Suggest Items Based on Weather</CardTitle>
          <CardDescription>Get quick suggestions for common weather conditions. Items will be added to the current trip's list.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleSuggestItems('Sunny')} disabled={!selectedTripId || isLoadingItems}><Sun className="mr-2 h-4 w-4 text-yellow-500"/> Sunny</Button>
          <Button variant="outline" onClick={() => handleSuggestItems('Rainy')} disabled={!selectedTripId || isLoadingItems}><CloudRain className="mr-2 h-4 w-4 text-blue-500"/> Rainy</Button>
          <Button variant="outline" onClick={() => handleSuggestItems('Cold')} disabled={!selectedTripId || isLoadingItems}><Snowflake className="mr-2 h-4 w-4 text-sky-500"/> Cold</Button>
        </CardContent>
      </Card>

      {!selectedTripId && !isLoadingUserTrips && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground flex items-center justify-center"><Info className="mr-2 h-8 w-8 text-primary" />No Trip Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Please select a trip from the dropdown above to manage its packing list.
              </CardDescription>
               <Image 
                src="https://picsum.photos/seed/select-trip-packing/400/250" 
                alt="Select a trip for packing list" 
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
          <p className="ml-3 text-muted-foreground">Loading packing list for {selectedTrip?.name || "trip"}...</p>
        </div>
      )}

      {selectedTripId && !isLoadingItems && items.length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">Packing List is Empty for {selectedTrip?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Add items you need to pack, or get suggestions based on weather!
              </CardDescription>
               <Image 
                src="https://picsum.photos/seed/empty-packing-trip/400/250" 
                alt="Empty Packing List Illustration for Trip" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel luggage"
              />
            </CardContent>
         </Card>
      )}

      {selectedTripId && !isLoadingItems && items.length > 0 && sortedCategories.map((category) => (
        <Card key={category} className="mb-6 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-primary">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {itemsByCategory[category].map(item => (
                <li key={item.id} className="flex items-center justify-between p-3 rounded-md border bg-background hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.packed}
                      onCheckedChange={() => handleTogglePacked(item.id, item.packed)}
                      className="mr-3"
                      disabled={isLoadingItems}
                    />
                    <Label htmlFor={`item-${item.id}`} className={cn("text-foreground", item.packed && "line-through text-muted-foreground")}>
                      {item.name}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-muted-foreground hover:text-primary" disabled={isLoadingItems}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-destructive" disabled={isLoadingItems}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
