
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { AuthStatus } from '@/components/layout/auth-status';
import { JourneySyncLogo } from '@/components/icons';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { TripProvider } from '@/contexts/TripContext';
import { PageContentSidebarTrigger } from '@/components/layout/page-content-sidebar-trigger';
import { MobileAuthHeader } from '@/components/layout/mobile-auth-header';


const geistSans = Geist({
  variable: '--font-geist-sans',
  weights: ['400', '700'], // Explicitly define weights
  display: 'swap',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  weights: ['400'], // Explicitly define weight
  display: 'swap',
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
        <AuthProvider>
          <TripProvider>
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
                <SidebarFooter className="p-2 border-t border-sidebar-border">
                  <AuthStatus />
                </SidebarFooter>
              </Sidebar>
              <SidebarInset>
                <PageContentSidebarTrigger />
                <MobileAuthHeader />
                {children}
              </SidebarInset>
            </SidebarProvider>
          </TripProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
