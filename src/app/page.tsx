
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, MapPin, Sparkles, Luggage, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const features = [
    { name: "Collaborative Itinerary", icon: ListChecks, href: "/itinerary", description: "Plan your trip together in real-time." },
    { name: "Interactive Map", icon: MapPin, href: "/map", description: "Pin locations and visualize your journey." },
    { name: "Smart Recommendations", icon: Sparkles, href: "/recommendations", description: "Get AI-powered local suggestions." },
    { name: "Packing Checklist", icon: Luggage, href: "/packing-list", description: "Create and manage your packing lists." },
    { name: "Group Polls", icon: UsersRound, href: "/polls", description: "Make group decisions easily." },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-gradient-to-br from-background to-secondary">
      <header className="text-center mb-12">
        <Image 
          src="https://picsum.photos/seed/journeysync/150/150" 
          alt="JourneySync Logo Placeholder" 
          width={120} 
          height={120} 
          className="rounded-full mx-auto mb-6 shadow-lg"
          data-ai-hint="travel adventure" 
        />
        <h1 className="text-5xl font-bold text-primary mb-2">Welcome to JourneySync</h1>
        <p className="text-xl text-muted-foreground">Your ultimate collaborative travel planner.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        {features.map((feature) => (
          <Card key={feature.name} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center gap-4">
              <feature.icon className="w-8 h-8 text-primary" />
              <CardTitle className="text-xl">{feature.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
              <Link href={feature.href} passHref>
                <Button variant="outline" className="mt-4 w-full">
                  Go to {feature.name}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="mt-16 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} JourneySync. Adventure awaits! Created by Zuhair Mumtaz.</p>
      </footer>
    </div>
  );
}

