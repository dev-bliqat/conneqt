export const leadStatuses = [
  "Ny",
  "Kontaktad",
  "Kvalificerad",
  "Vunnen",
  "Förlorad",
] as const;

export const dealStages = [
  "Prospekt",
  "Möte bokat",
  "Offert",
  "Förhandling",
  "Vunnen",
] as const;

export const activityTypes = ["Samtal", "E-post", "Möte", "Uppgift"] as const;
export const customerStatuses = [
  "Ska boka nytt möte",
  "Ska skapa konto",
  "Konto skapat",
  "Betalande kund",
  "Ej intresserad",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];
export type DealStage = (typeof dealStages)[number];
export type ActivityType = (typeof activityTypes)[number];
export type CustomerStatus = (typeof customerStatuses)[number];

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  value: number;
  nextStep: string;
  notes: string;
  owner: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  segment: string;
  status: CustomerStatus | "";
  statusNotes: string;
  city: string;
  notes: string;
  followUpDate: string;
  followUpAction: string;
  lastFollowUpCompletedAt: string;
  wonAt: string;
  wonValue: number;
  owner: string;
  createdAt: string;
};

export type Deal = {
  id: string;
  name: string;
  company: string;
  stage: DealStage;
  value: number;
  owner: string;
  expectedCloseDate: string;
  sourceLeadId: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  title: string;
  type: ActivityType;
  status: "Planerad" | "Klar";
  dueDate: string;
  owner: string;
  relatedType: "lead" | "customer" | "deal" | "general";
  relatedId: string;
  notes: string;
  createdAt: string;
};

export type CalendarMeeting = {
  id: string;
  googleEventId: string;
  provider: "google";
  ownerUserId: string;
  customerId: string | null;
  leadId: string | null;
  dealId: string | null;
  summary: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  status: string;
  htmlLink: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  userId: string;
  fullName: string;
  role: string;
  focusArea: string;
  bio: string;
  emailSignature: string;
  emailSignatureLogoDataUrl: string;
  emailSignatureLogoWidth: number;
  emailSignatureLogoPlacement: "above" | "below" | "left" | "right";
  updatedAt: string;
};

export type CrmData = {
  leads: Lead[];
  customers: Customer[];
  deals: Deal[];
  activities: Activity[];
  calendarMeetings: CalendarMeeting[];
  profiles: Profile[];
};
