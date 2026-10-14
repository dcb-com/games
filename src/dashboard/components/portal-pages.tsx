import {
  Building2,
  ChartColumn,
  CircleDollarSign,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";

import type { NavItem } from "~/dashboard/components/sidebar";

// The admin nav, as the real dashboard draws it for a company admin. In the
// real app each leaf is a page; here they go nowhere.
export const PORTAL_NAV: NavItem[] = [
  {
    kind: "link",
    label: "Dashboard",
    icon: LayoutDashboard,
    leaf: { path: "/", label: "Dashboard", page: null },
  },
  {
    kind: "group",
    label: "Payroll",
    icon: CircleDollarSign,
    children: [
      { path: "/payroll/run", label: "Run payroll", page: null },
      { path: "/payroll/history", label: "History", page: null },
      { path: "/payroll/gl-export", label: "Accounting export", page: null },
    ],
  },
  {
    kind: "group",
    label: "People",
    icon: Users,
    children: [
      { path: "/people", label: "All people", page: null },
      { path: "/people/onboarding", label: "Onboarding", page: null },
      { path: "/people/w4", label: "W-4 requests", page: null },
      { path: "/people/i9", label: "I-9 forms", page: null },
    ],
  },
  {
    kind: "group",
    label: "Company",
    icon: Building2,
    children: [
      { path: "/company", label: "Company info", page: null },
      { path: "/company/taxes", label: "Taxes", page: null },
    ],
  },
  {
    kind: "link",
    label: "Business account",
    icon: Landmark,
    leaf: { path: "/business-account", label: "Business account", page: null },
  },
  {
    kind: "link",
    label: "Invoices",
    icon: ReceiptText,
    leaf: { path: "/invoices", label: "Invoices", page: null },
  },
  {
    kind: "link",
    label: "Reports",
    icon: ChartColumn,
    leaf: { path: "/reports", label: "Reports", page: null },
  },
  {
    kind: "link",
    label: "Settings",
    icon: Settings,
    leaf: { path: "/settings", label: "Settings", page: null, end: false },
  },
];
