import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Search,
  Map,
  Target,
  PhoneCall,
  KanbanSquare,
  Building2,
  Gauge,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Today's calls, follow-ups and new opportunities" },
  { title: "Lead Finder", href: "/lead-finder", icon: Search, description: "Search real local businesses" },
  { title: "Lead Map", href: "/lead-map", icon: Map, description: "Explore leads geographically" },
  { title: "Opportunities", href: "/opportunities", icon: Target, description: "Full lead table, scored and filterable" },
  { title: "Call List", href: "/call-list", icon: PhoneCall, description: "Queues and the calling workspace" },
  { title: "CRM / Pipeline", href: "/crm", icon: KanbanSquare, description: "Track leads through your sales process" },
  { title: "Business Details", href: "/businesses", icon: Building2, description: "Every business you've discovered" },
  { title: "Website Audit", href: "/audits", icon: Gauge, description: "Technical audits and opportunity scoring" },
  { title: "Demo Generator", href: "/demos", icon: Sparkles, description: "Generate a website concept to pitch" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, description: "Funnel, conversion and revenue" },
  { title: "Settings", href: "/settings", icon: Settings, description: "Product, pricing and integrations" },
];
