export type NavigationItem = {
  href: string;
  label: string;
  blurb: string;
  section: "Översikt" | "Sälj" | "Konto";
  shortLabel: string;
};

export const navigationItems: NavigationItem[] = [
  {
    href: "/hem",
    label: "Hem",
    blurb: "Startyta och nuläge",
    section: "Översikt",
    shortLabel: "HEM",
  },
  {
    href: "/kunder",
    label: "Kunder",
    blurb: "Företagskunder och status",
    section: "Sälj",
    shortLabel: "KND",
  },
  {
    href: "/aktiviteter",
    label: "Kalender",
    blurb: "Planerade uppföljningar",
    section: "Sälj",
    shortLabel: "KAL",
  },
];
