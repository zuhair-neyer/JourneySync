"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, PlusCircle, Edit3, Trash, List } from "lucide-react";
import Image from "next/image";

interface PinnedLocation {
  id: string;
  name: string;
  notes: string;
  lat: number;
  lng: number;
}

export default function MapPage() {
  const [pinnedLocations, setPinnedLocations] = useState<PinnedLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentPin, setCurrentPin] = useState<Partial<PinnedLocation>>({});
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  
  // Effect to prevent hydration mismatch
  useEffect(() => {
    const initialPins: PinnedLocation[] = [
      { id: '1', name: 'Eiffel Tower Viewpoint', notes: 'Great spot for photos', lat: 48.8584, lng: 2.2945 },
      { id: '2', name: 'Favorite Gelato Place', notes: 'Must try pistachio!', lat: 41.9028, lng: 12.4964 },
    ];
    setPinnedLocations(initialPins);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentPin(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentPin(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSubmitPin = () => {
    if (!currentPin.name || currentPin.lat === undefined || currentPin.lng === undefined) {
      alert("Please fill in name, latitude, and longitude.");
      return;
    }
    if (editingPinId) {
      setPinnedLocations(pinnedLocations.map(pin => pin.id === editingPinId ? { ...pin, ...currentPin } as PinnedLocation : pin));
    } else {
      setPinnedLocations([...pinnedLocations, { ...currentPin, id: Date.now().toString() } as PinnedLocation]);
    }
    setShowForm(false);
    setCurrentPin({});
    setEditingPinId(null);
  };
  
  const handleEditPin = (pin: PinnedLocation) => {
    setCurrentPin(pin);
    setEditingPinId(pin.id);
    setShowForm(true);
  };

  const handleDeletePin = (id: string) => {
    setPinnedLocations(pinnedLocations.filter(pin => pin.id !== id));
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-var(--header-height,4rem))]"> {/* Adjust header height if you have one */}
      <div className="md:w-1/3 p-4 overflow-y-auto bg-card border-r">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-primary">Pinned Locations</h2>
          <Button onClick={() => { setShowForm(true); setCurrentPin({}); setEditingPinId(null);}} size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Pin
          </Button>
        </div>

        {showForm && (
          <Card className="mb-4 p-4 shadow-md">
            <h3 className="text-lg font-medium mb-2 text-primary">{editingPinId ? 'Edit Pin' : 'New Pin'}</h3>
            <Input name="name" placeholder="Location Name" value={currentPin.name || ''} onChange={handleInputChange} className="mb-2 bg-background" />
            <Textarea name="notes" placeholder="Notes" value={currentPin.notes || ''} onChange={handleInputChange} className="mb-2 bg-background"/>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input name="lat" type="number" placeholder="Latitude" value={currentPin.lat || ''} onChange={handleCoordinateChange} className="bg-background"/>
              <Input name="lng" type="number" placeholder="Longitude" value={currentPin.lng || ''} onChange={handleCoordinateChange} className="bg-background"/>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmitPin} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Pin</Button>
            </div>
          </Card>
        )}

        {pinnedLocations.length > 0 ? (
          <ul className="space-y-3">
            {pinnedLocations.map(pin => (
              <li key={pin.id} className="p-3 rounded-lg border bg-background shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground">{pin.name}</h4>
                    <p className="text-xs text-muted-foreground">Lat: {pin.lat?.toFixed(4)}, Lng: {pin.lng?.toFixed(4)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{pin.notes}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPin(pin)} className="text-muted-foreground hover:text-primary">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePin(pin.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !showForm && <p className="text-muted-foreground">No locations pinned yet. Add one to see it on the map!</p>
        )}
      </div>

      <div className="flex-1 bg-secondary flex flex-col items-center justify-center p-4 relative">
        <MapPin className="w-24 h-24 text-primary opacity-30 mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-2">Interactive Map</h1>
        <p className="text-lg text-muted-foreground mb-6">Map integration will appear here.</p>
        <Image 
            src="https://picsum.photos/seed/map-placeholder/800/600" 
            alt="Map Placeholder" 
            width={800} 
            height={600}
            className="rounded-lg shadow-xl object-cover w-full max-w-3xl h-auto max-h-[500px]"
            data-ai-hint="world map"
        />
        <div className="absolute bottom-4 right-4 bg-card p-3 rounded-lg shadow-lg">
            <p className="text-sm text-muted-foreground">
                Tip: Use the panel on the left to add and manage your pinned locations.
            </p>
        </div>
      </div>
    </div>
  );
}
