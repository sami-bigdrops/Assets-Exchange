import type {
  SidebarMenuConfig,
  UserProfileConfig,
} from "../types/sidebar.types";

export const exampleUserProfile: UserProfileConfig = {
  name: "Jhon Doe",
  phone: "(123) 456 - 7890",
  email: "superadmin@bigdropsm.ing.com",
};

export const adminMenuConfig: SidebarMenuConfig = [
  {
    id: "main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/dashboard",
      },
      {
        id: "Creatives",
        label: "Creatives",
        icon: "FileText",
        href: "/creatives",
      },
      {
        id: "manage-requests",
        label: "Manage Requests",
        icon: "ClipboardList",
        href: "/requests",
      },
      {
        id: "manage-response",
        label: "Manage Response",
        icon: "MessageSquareReply",
        href: "/response",
      },
      {
        id: "manage-advertisers",
        label: "Manage Advertisers",
        icon: "Megaphone",
        href: "/advertisers",
      },
      // {
      //   id: "manage-publishers",
      //   label: "Manage Publishers",
      //   icon: "UsersRound",
      //   href: "/publishers",
      // },
      {
        id: "offers",
        label: "Offers",
        icon: "Target",
        href: "/offers",
      },
      // {
      //   id: "analytics",
      //   label: "Analytics",
      //   icon: "ChartColumnIncreasing",
      //   href: "/analytics",
      // },
      // {
      //   id: "ai-settings",
      //   label: "AI Settings",
      //   icon: "Settings",
      //   href: "/ai-settings",
      // },
      {
        id: "settings",
        label: "Settings",
        icon: "Settings2",
        href: "/settings",
      },
    ],
  },
];

// export const advertiserMenuConfig: SidebarMenuConfig = [
//   {
//     id: "main",
//     items: [
//       {
//         id: "dashboard",
//         label: "Dashboard",
//         icon: LayoutDashboard,
//         href: "/dashboard",
//       },
//       {
//         id: "my-campaigns",
//         label: "My Campaigns",
//         icon: Campaign,
//         href: "/dashboard/my-campaigns",
//       },
//       {
//         id: "create-campaign",
//         label: "Create Campaign",
//         icon: FileText,
//         href: "/dashboard/create-campaign",
//       },
//       {
//         id: "analytics",
//         label: "Analytics",
//         icon: BarChart3,
//         href: "/dashboard/analytics",
//       },
//     ],
//   },
//   {
//     id: "secondary",
//     items: [
//       {
//         id: "billing",
//         label: "Billing",
//         icon: CreditCard,
//         href: "/dashboard/billing",
//       },
//       {
//         id: "settings",
//         label: "Settings",
//         icon: Settings,
//         href: "/dashboard/settings",
//       },
//       {
//         id: "help",
//         label: "Help & Support",
//         icon: HelpCircle,
//         href: "/dashboard/help",
//       },
//     ],
//   },
// ];

// export const administratorMenuConfig: SidebarMenuConfig = [
//   {
//     id: "main",
//     items: [
//       {
//         id: "dashboard",
//         label: "Dashboard",
//         icon: LayoutDashboard,
//         href: "/dashboard",
//       },
//       {
//         id: "users",
//         label: "User Management",
//         icon: Users,
//         href: "/dashboard/users",
//       },
//       {
//         id: "campaigns",
//         label: "All Campaigns",
//         icon: Campaign,
//         href: "/dashboard/campaigns",
//       },
//       {
//         id: "analytics",
//         label: "Analytics",
//         icon: BarChart3,
//         href: "/dashboard/analytics",
//       },
//     ],
//   },
//   {
//     id: "secondary",
//     items: [
//       {
//         id: "settings",
//         label: "System Settings",
//         icon: Settings,
//         href: "/dashboard/settings",
//       },
//       {
//         id: "help",
//         label: "Help & Support",
//         icon: HelpCircle,
//         href: "/dashboard/help",
//       },
//     ],
//   },
// ];
