import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { JourneySyncLogo } from '@/components/icons';
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react'; // For theme toggle, optional

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'JourneySync - Collaborative Travel Planner',
  description: 'Plan your trips collaboratively with JourneySync. Features include shared itineraries, expense tracking, interactive maps, and smart recommendations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider defaultOpen>
          <Sidebar className="border-r border-sidebar-border shadow-lg">
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                <JourneySyncLogo className="h-8 w-8 text-sidebar-primary" />
                <h1 className="text-xl font-semibold text-sidebar-foreground">JourneySync</h1>
              </div>
              <SidebarTrigger className="ml-auto text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" />
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
            {/* Optional Theme Toggle Example in Footer 
            <SidebarFooter className="p-2">
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Sun className="mr-2 h-4 w-4" /> Light Mode
              </Button>
            </SidebarFooter>
            */}
          </Sidebar>
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
