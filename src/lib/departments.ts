/**
 * Department configuration for Agent Imperie.
 * Every agent belongs to one department. Departments map to real business
 * functions — together they form the full operating company.
 */

export type DepartmentId =
  | "command"
  | "engineering"
  | "sales"
  | "marketing"
  | "analytics"
  | "operations"
  | "finance"
  | "research";

export interface Department {
  id: DepartmentId;
  name: string;
  shortName: string;
  description: string;
  /** Tailwind color token for accent/bg — used in UI */
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  /** Lucide icon name */
  icon: string;
}

export const DEPARTMENTS: Department[] = [
  {
    id: "command",
    name: "Command",
    shortName: "CMD",
    description: "C-Suite operasjonssenter. Strategisk styring og orkestrering av hele flåten.",
    color: "violet",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    textColor: "text-violet-400",
    icon: "Crown",
  },
  {
    id: "engineering",
    name: "Engineering",
    shortName: "ENG",
    description: "Skriver kode, reviewer, tester og deployer. Full utviklingssyklus i flåten.",
    color: "blue",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-400",
    icon: "Code2",
  },
  {
    id: "sales",
    name: "Sales",
    shortName: "SAL",
    description: "Fra prospekt til lukket deal. Forskning, outreach, oppfølging og pipeline.",
    color: "green",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    textColor: "text-green-400",
    icon: "TrendingUp",
  },
  {
    id: "marketing",
    name: "Marketing",
    shortName: "MKT",
    description: "Innhold, SEO, brand og distribusjon. Alt som bygger merkevare og trafikk.",
    color: "pink",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    textColor: "text-pink-400",
    icon: "Megaphone",
  },
  {
    id: "analytics",
    name: "Analytics",
    shortName: "ANL",
    description: "Data, mønstre og intelligens. Forstår hva som skjer og hvorfor.",
    color: "amber",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-400",
    icon: "BarChart3",
  },
  {
    id: "operations",
    name: "Operations",
    shortName: "OPS",
    description: "Overvåker systemer, sikkerhet og endringer. Holder imperiet oppe.",
    color: "red",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-400",
    icon: "Shield",
  },
  {
    id: "finance",
    name: "Finance",
    shortName: "FIN",
    description: "Kostnader, vekst og revenue. Holder styr på tallene som betyr noe.",
    color: "emerald",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-400",
    icon: "DollarSign",
  },
  {
    id: "research",
    name: "Research",
    shortName: "R&D",
    description: "Produkt, teknologi og kunnskap. Bygger fremtiden og dokumenterer nåtiden.",
    color: "cyan",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    textColor: "text-cyan-400",
    icon: "FlaskConical",
  },
];

export const DEPARTMENT_MAP = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d])
) as Record<DepartmentId, Department>;
