import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
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
import { MobilePageContentSidebarTrigger } from '@/components/layout/mobile-page-content-sidebar-trigger';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
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
      <body className={`${inter.variable} ${roboto_mono.variable} antialiased`}>
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
                <MobilePageContentSidebarTrigger />
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
