
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Sparkles, Luggage, UsersRound, Home, DollarSign, PlaneTakeoff, UserCog } from "lucide-react"; // Removed MapPin
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/trips", label: "My Trips", icon: PlaneTakeoff }, 
  { href: "/itinerary", label: "Itinerary", icon: ListChecks },
  // { href: "/map", label: "Map", icon: MapPin }, // Removed Map link
  // { href: "/recommendations", label: "Recommendations", icon: Sparkles }, // Removed Recommendations link
  { href: "/packing-list", label: "Packing List", icon: Luggage },
  { href: "/polls", label: "Group Polls", icon: UsersRound },
  { href: "/expenses", label: "Expenses", icon: DollarSign },
  { href: "/account", label: "Account", icon: UserCog },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground",
                pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              )}
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
