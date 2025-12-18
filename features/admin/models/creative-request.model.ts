/**
 * UNIFIED MOCK DATA - Single Source of Truth
 *
 * This file contains mock data for creative requests following the UNIFIED model.
 * ONE creative submission = ONE record that flows through the entire workflow.
 *
 * WORKFLOW STATES:
 * 1. Publisher submits → status: 'new', approvalStage: 'admin'
 * 2. Admin approves → status: 'pending', approvalStage: 'advertiser'
 * 3. Advertiser acts:
 *    - Approves → status: 'approved', approvalStage: 'completed'
 *    - Rejects → status: 'rejected', approvalStage: 'advertiser'
 *    - Sends back → status: 'sent-back', approvalStage: 'advertiser'
 */

import type { Request } from "../types/admin.types";

export const creativeRequests: Request[] = [
  // ============ REQUESTS AWAITING ADMIN APPROVAL ============
  {
    id: "req-1",
    date: "20th December 2024",
    offerId: "5001",
    offerName:
      "RETAIL - E-COMMERCE - [Holiday Special] - [US/CA] - [Email/Display] - [All Days]",
    advertiserName: "Amazon Affiliates",
    affiliateId: "AFF-8901",
    priority: "High Priority",
    clientId: "CLI-1001",
    clientName: "Digital Media Group",
    creativeType: "Email",
    creativeCount: 3,
    fromLinesCount: 2,
    subjectLinesCount: 3,
    status: "new",
    approvalStage: "admin",
  },
  {
    id: "req-2",
    date: "19th December 2024",
    offerId: "5002",
    offerName:
      "TECH - SOFTWARE - [B2B Leads] - [Global] - [Email] - [Mon-Fri Only]",
    advertiserName: "Google Marketing",
    affiliateId: "AFF-8902",
    priority: "Medium Priority",
    clientId: "CLI-1002",
    clientName: "Prime Publishers Inc",
    creativeType: "Display",
    creativeCount: 5,
    fromLinesCount: 0,
    subjectLinesCount: 0,
    status: "new",
    approvalStage: "admin",
  },
  {
    id: "req-3",
    date: "18th December 2024",
    offerId: "5003",
    offerName:
      "SOFTWARE - SAAS - [Enterprise] - [US/UK/EU] - [Email/LinkedIn] - [Business Hours]",
    advertiserName: "Microsoft Advertising",
    affiliateId: "AFF-8903",
    priority: "High Priority",
    clientId: "CLI-1003",
    clientName: "Tech Media Network",
    creativeType: "Email",
    creativeCount: 2,
    fromLinesCount: 2,
    subjectLinesCount: 2,
    status: "new",
    approvalStage: "admin",
  },
  {
    id: "req-12",
    date: "21st December 2024",
    offerId: "5012",
    offerName:
      "TRAVEL - VACATION RENTALS - [Holiday Season] - [Global] - [Email/Social] - [All Days]",
    advertiserName: "Airbnb Partnerships",
    affiliateId: "AFF-8912",
    priority: "Medium Priority",
    clientId: "CLI-1012",
    clientName: "Vacation Media Network",
    creativeType: "Email",
    creativeCount: 3,
    fromLinesCount: 2,
    subjectLinesCount: 3,
    status: "new",
    approvalStage: "admin",
  },

  // ============ REQUESTS FORWARDED TO ADVERTISER (Admin Approved) ============
  {
    id: "req-4",
    date: "17th December 2024",
    offerId: "5004",
    offerName:
      "SOCIAL - LEAD GEN - [Age 25-45] - [US/CA/UK] - [Social Media] - [All Days]",
    advertiserName: "Facebook Ads Network",
    affiliateId: "AFF-8904",
    priority: "Medium Priority",
    clientId: "CLI-1004",
    clientName: "Social Reach Media",
    creativeType: "Social Media",
    creativeCount: 10,
    fromLinesCount: 0,
    subjectLinesCount: 0,
    status: "pending",
    approvalStage: "advertiser",
  },
  {
    id: "req-5",
    date: "16th December 2024",
    offerId: "5005",
    offerName:
      "TRAVEL - HOTEL BOOKING - [Summer Campaign] - [Global] - [Email/Display] - [All Days]",
    advertiserName: "Booking.com Partners",
    affiliateId: "AFF-8905",
    priority: "High Priority",
    clientId: "CLI-1005",
    clientName: "Travel Publishers Ltd",
    creativeType: "Email",
    creativeCount: 4,
    fromLinesCount: 3,
    subjectLinesCount: 4,
    status: "pending",
    approvalStage: "advertiser",
  },
  {
    id: "req-13",
    date: "9th December 2024",
    offerId: "5013",
    offerName:
      "COMMUNICATION - VIDEO CONFERENCING - [Business Plans] - [Global] - [Email] - [Business Hours]",
    advertiserName: "Zoom Communications",
    affiliateId: "AFF-8913",
    priority: "Medium Priority",
    clientId: "CLI-1013",
    clientName: "Enterprise Communication Media",
    creativeType: "Email",
    creativeCount: 2,
    fromLinesCount: 2,
    subjectLinesCount: 2,
    status: "pending",
    approvalStage: "advertiser",
  },

  // ============ FULLY APPROVED REQUESTS (Both Admin & Advertiser Approved) ============
  {
    id: "req-6",
    date: "15th December 2024",
    offerId: "5006",
    offerName:
      "DESIGN - SOFTWARE - [Creative Professionals] - [Global] - [Email] - [Business Hours]",
    advertiserName: "Adobe Creative Cloud",
    affiliateId: "AFF-8906",
    priority: "Medium Priority",
    clientId: "CLI-1006",
    clientName: "Creative Publishers Group",
    creativeType: "Email",
    creativeCount: 3,
    fromLinesCount: 2,
    subjectLinesCount: 3,
    status: "approved",
    approvalStage: "completed",
  },
  {
    id: "req-7",
    date: "14th December 2024",
    offerId: "5007",
    offerName:
      "CRM - ENTERPRISE - [B2B Sales] - [US/EU] - [Email/LinkedIn] - [Mon-Fri Only]",
    advertiserName: "Salesforce Marketing",
    affiliateId: "AFF-8907",
    priority: "High Priority",
    clientId: "CLI-1007",
    clientName: "Enterprise Media Solutions",
    creativeType: "Email",
    creativeCount: 2,
    fromLinesCount: 2,
    subjectLinesCount: 2,
    status: "approved",
    approvalStage: "completed",
  },
  {
    id: "req-8",
    date: "13th December 2024",
    offerId: "5008",
    offerName:
      "TECH - DEVELOPMENT - [iOS Developers] - [Global] - [Email] - [All Days]",
    advertiserName: "Apple Developer Network",
    affiliateId: "AFF-8908",
    priority: "Medium Priority",
    clientId: "CLI-1008",
    clientName: "Developer Network Partners",
    creativeType: "Email",
    creativeCount: 4,
    fromLinesCount: 3,
    subjectLinesCount: 4,
    status: "approved",
    approvalStage: "completed",
  },

  // ============ REJECTED REQUESTS ============
  // Rejected by admin (never made it to advertiser)
  {
    id: "req-9",
    date: "12th December 2024",
    offerId: "5009",
    offerName:
      "STREAMING - ENTERTAINMENT - [Premium Subscribers] - [US/CA/UK] - [Video/Display] - [All Days]",
    advertiserName: "Netflix Advertising",
    affiliateId: "AFF-8909",
    priority: "High Priority",
    clientId: "CLI-1009",
    clientName: "Entertainment Media Hub",
    creativeType: "Video",
    creativeCount: 6,
    fromLinesCount: 0,
    subjectLinesCount: 0,
    status: "rejected",
    approvalStage: "admin",
  },
  // Rejected by advertiser (admin had approved it)
  {
    id: "req-10",
    date: "11th December 2024",
    offerId: "5010",
    offerName:
      "MUSIC - STREAMING - [Ad-Free Trial] - [Global] - [Audio/Display] - [All Days]",
    advertiserName: "Spotify for Brands",
    affiliateId: "AFF-8910",
    priority: "Medium Priority",
    clientId: "CLI-1010",
    clientName: "Audio Publishers Network",
    creativeType: "Audio",
    creativeCount: 8,
    fromLinesCount: 0,
    subjectLinesCount: 0,
    status: "rejected",
    approvalStage: "advertiser",
  },

  // ============ SENT BACK BY ADVERTISER (Needs admin reconsideration) ============
  {
    id: "req-11",
    date: "10th December 2024",
    offerId: "5011",
    offerName:
      "TRANSPORTATION - BUSINESS - [Corporate Accounts] - [US/EU/APAC] - [Email/Mobile] - [All Days]",
    advertiserName: "Uber for Business",
    affiliateId: "AFF-8911",
    priority: "High Priority",
    clientId: "CLI-1011",
    clientName: "Business Travel Publishers",
    creativeType: "Mobile",
    creativeCount: 5,
    fromLinesCount: 0,
    subjectLinesCount: 0,
    status: "sent-back",
    approvalStage: "advertiser",
  },
  {
    id: "req-14",
    date: "8th December 2024",
    offerId: "5014",
    offerName:
      "E-COMMERCE - PLATFORM - [Store Setup] - [Global] - [Email/Display] - [All Days]",
    advertiserName: "Shopify Partners",
    affiliateId: "AFF-8914",
    priority: "High Priority",
    clientId: "CLI-1014",
    clientName: "E-commerce Publishers Hub",
    creativeType: "Email",
    creativeCount: 4,
    fromLinesCount: 3,
    subjectLinesCount: 4,
    status: "sent-back",
    approvalStage: "advertiser",
  },
  {
    id: "req-15",
    date: "7th December 2024",
    offerId: "5015",
    offerName:
      "MARKETING - AUTOMATION - [CRM Integration] - [US/CA/EU] - [Email] - [Business Hours]",
    advertiserName: "HubSpot Marketing",
    affiliateId: "AFF-8915",
    priority: "Medium Priority",
    clientId: "CLI-1015",
    clientName: "Marketing Tech Publishers",
    creativeType: "Email",
    creativeCount: 3,
    fromLinesCount: 2,
    subjectLinesCount: 3,
    status: "sent-back",
    approvalStage: "advertiser",
  },
];
