"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit2, Sparkles, Sun, CloudRain, Snowflake, Luggage } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PackingItem {
  id: string;
  name: string;
  packed: boolean;
  category?: string; // e.g., Clothes, Toiletries, Documents
}

const initialCategories = ["Clothes", "Toiletries", "Documents", "Electronics", "Medication", "Miscellaneous"];

export default function PackingListPage() {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  
  useEffect(() => {
    // Load items from local storage or API if needed
    const initialItems: PackingItem[] = [
      { id: '1', name: 'Passport', packed: true, category: 'Documents' },
      { id: '2', name: 'T-shirts (x5)', packed: false, category: 'Clothes' },
      { id: '3', name: 'Toothbrush', packed: false, category: 'Toiletries' },
    ];
    setItems(initialItems);
  }, []);

  const handleAddItem = () => {
    if (newItemName.trim() === '') return;
    if (editingItem) {
      setItems(items.map(item => item.id === editingItem.id ? { ...item, name: newItemName } : item));
      setEditingItem(null);
    } else {
      setItems([...items, { id: Date.now().toString(), name: newItemName, packed: false, category: 'Miscellaneous' }]);
    }
    setNewItemName('');
  };

  const handleTogglePacked = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, packed: !item.packed } : item));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (editingItem?.id === id) {
      setEditingItem(null);
      setNewItemName('');
    }
  };

  const handleEditItem = (item: PackingItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
  };
  
  const handleSuggestItems = (weather: 'Sunny' | 'Rainy' | 'Cold') => {
    let suggestions: PackingItem[] = [];
    if (weather === 'Sunny') {
      suggestions = [
        { id: Date.now().toString() + 'sun1', name: 'Sunscreen', packed: false, category: 'Toiletries' },
        { id: Date.now().toString() + 'sun2', name: 'Sunglasses', packed: false, category: 'Accessories' },
        { id: Date.now().toString() + 'sun3', name: 'Hat', packed: false, category: 'Clothes' },
      ];
    } else if (weather === 'Rainy') {
      suggestions = [
        { id: Date.now().toString() + 'rain1', name: 'Umbrella', packed: false, category: 'Accessories' },
        { id: Date.now().toString() + 'rain2', name: 'Raincoat', packed: false, category: 'Clothes' },
      ];
    } else if (weather === 'Cold') {
       suggestions = [
        { id: Date.now().toString() + 'cold1', name: 'Warm Jacket', packed: false, category: 'Clothes' },
        { id: Date.now().toString() + 'cold2', name: 'Gloves', packed: false, category: 'Clothes' },
        { id: Date.now().toString() + 'cold3', name: 'Scarf', packed: false, category: 'Clothes' },
      ];
    }
    const newItems = suggestions.filter(sugg => !items.find(item => item.name.toLowerCase() === sugg.name.toLowerCase()));
    setItems(prevItems => [...prevItems, ...newItems]);
  };

  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Miscellaneous';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <Luggage className="w-16 h-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary">Packing Checklist</h1>
        <p className="text-muted-foreground">Get ready for your trip! Don't forget anything important.</p>
      </header>

      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader>
          <CardTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., Sunscreen, Passport"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-grow bg-background"
            />
            <Button onClick={handleAddItem} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {editingItem ? <Edit2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {editingItem ? 'Update' : 'Add'}
            </Button>
            {editingItem && <Button variant="outline" onClick={() => { setEditingItem(null); setNewItemName(''); }}>Cancel Edit</Button>}
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" />Suggest Items Based on Weather</CardTitle>
          <CardDescription>Get quick suggestions for common weather conditions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleSuggestItems('Sunny')}><Sun className="mr-2 h-4 w-4 text-yellow-500"/> Sunny</Button>
          <Button variant="outline" onClick={() => handleSuggestItems('Rainy')}><CloudRain className="mr-2 h-4 w-4 text-blue-500"/> Rainy</Button>
          <Button variant="outline" onClick={() => handleSuggestItems('Cold')}><Snowflake className="mr-2 h-4 w-4 text-sky-500"/> Cold</Button>
        </CardContent>
      </Card>

      {Object.keys(itemsByCategory).length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">Your Packing List is Empty</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Add items you need to pack for your trip, or get suggestions based on weather!
              </CardDescription>
               <Image 
                src="https://picsum.photos/seed/empty-packing/400/250" 
                alt="Empty Packing List Illustration" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel luggage"
              />
            </CardContent>
         </Card>
      )}

      {Object.entries(itemsByCategory).map(([category, catItems]) => (
        <Card key={category} className="mb-6 shadow-md bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-primary">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {catItems.map(item => (
                <li key={item.id} className="flex items-center justify-between p-3 rounded-md border bg-background hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.packed}
                      onCheckedChange={() => handleTogglePacked(item.id)}
                      className="mr-3"
                    />
                    <Label htmlFor={`item-${item.id}`} className={cn("text-foreground", item.packed && "line-through text-muted-foreground")}>
                      {item.name}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-destructive">
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
