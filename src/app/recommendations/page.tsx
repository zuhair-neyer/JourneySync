"use client";

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { getSmartRecommendations, SmartRecommendationsInput, SmartRecommendationsOutput } from '@/ai/flows/smart-recommendations';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MapPin as PinIcon, Building, Utensils, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";


const initialState: { recommendations?: SmartRecommendationsOutput['recommendations']; error?: string; } = {
  recommendations: [],
};

async function handleSubmit(_prevState: any, formData: FormData) {
  const input: SmartRecommendationsInput = {
    userPreferences: formData.get('userPreferences') as string,
    timeOfDay: formData.get('timeOfDay') as string,
    weather: formData.get('weather') as string,
    location: formData.get('location') as string,
  };

  if (!input.userPreferences || !input.timeOfDay || !input.weather || !input.location) {
    return { error: "Please fill in all fields." };
  }

  try {
    const result = await getSmartRecommendations(input);
    return { recommendations: result.recommendations };
  } catch (e: any) {
    console.error("Error getting recommendations:", e);
    return { error: e.message || "Failed to fetch recommendations." };
  }
}


export default function RecommendationsPage() {
  const [state, formAction] = useFormState(handleSubmit, initialState);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Ensures client-side only execution for toast
  }, []);

  useEffect(() => {
    if (mounted && state?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.error,
      });
    }
  }, [state?.error, toast, mounted]);
  
  const getIconForType = (type: string) => {
    if (type.toLowerCase().includes('restaurant') || type.toLowerCase().includes('cafe') || type.toLowerCase().includes('food')) return <Utensils className="h-5 w-5 text-accent" />;
    if (type.toLowerCase().includes('museum') || type.toLowerCase().includes('gallery')) return <Building className="h-5 w-5 text-accent" />;
    if (type.toLowerCase().includes('park') || type.toLowerCase().includes('nature')) return <Sparkles className="h-5 w-5 text-accent" />; // Using Sparkles as a general outdoor icon
    return <PinIcon className="h-5 w-5 text-accent" />;
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <Sparkles className="w-16 h-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary">Smart Recommendations</h1>
        <p className="text-muted-foreground">Discover local gems tailored to your preferences!</p>
      </header>

      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader>
          <CardTitle>Find Your Next Adventure</CardTitle>
          <CardDescription>Tell us a bit about what you're looking for, and we'll suggest some great spots.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div>
              <Label htmlFor="userPreferences" className="font-semibold">Your Preferences</Label>
              <Textarea id="userPreferences" name="userPreferences" placeholder="e.g., Love cozy cafes, interested in history, enjoy outdoor activities" required className="mt-1 bg-background"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="timeOfDay" className="font-semibold">Time of Day</Label>
                 <Select name="timeOfDay" required>
                    <SelectTrigger id="timeOfDay" className="mt-1 w-full bg-background">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div>
                <Label htmlFor="weather" className="font-semibold">Current Weather</Label>
                <Input id="weather" name="weather" placeholder="e.g., Sunny, 25°C" required className="mt-1 bg-background"/>
              </div>
              <div>
                <Label htmlFor="location" className="font-semibold">Your Location</Label>
                <Input id="location" name="location" placeholder="e.g., Downtown, Paris" required className="mt-1 bg-background"/>
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Sparkles className="mr-2 h-5 w-5" /> Get Recommendations
            </Button>
          </form>
        </CardContent>
      </Card>

      {state?.recommendations && state.recommendations.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-primary mb-6">Here are your personalized recommendations:</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {state.recommendations.map((rec, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {getIconForType(rec.type)}
                    <CardTitle className="text-xl text-primary">{rec.name}</CardTitle>
                  </div>
                   <Image 
                    src={`https://picsum.photos/seed/rec${index}/400/200`} 
                    alt={rec.name} 
                    width={400} 
                    height={200} 
                    className="rounded-md object-cover w-full h-40"
                    data-ai-hint={`${rec.type} place`}
                  />
                  <CardDescription className="text-sm text-muted-foreground mt-2">Type: {rec.type}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-foreground">{rec.description}</p>
                </CardContent>
                <CardFooter className="flex-col items-start border-t pt-4">
                  <h4 className="font-semibold text-sm text-primary mb-1 flex items-center"><ThumbsUp className="h-4 w-4 mr-2 text-accent" /> Why we suggest this:</h4>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {!state?.error && state?.recommendations?.length === 0 && !initialState.recommendations?.length && (
         <Card className="text-center p-8 shadow-md bg-card mt-8">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">Ready for Suggestions?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Fill out the form above to get AI-powered recommendations for your trip!
              </CardDescription>
              <Image 
                src="https://picsum.photos/seed/waiting-recommendation/400/250" 
                alt="Waiting for recommendations illustration" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="ideas discovery"
              />
            </CardContent>
         </Card>
      )}

    </div>
  );
}
