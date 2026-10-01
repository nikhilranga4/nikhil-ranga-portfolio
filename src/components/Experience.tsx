import { useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Calendar, Code2, FileCode2, FileText, GitBranch, MapPin, Users } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

interface Role {
  file: string;
  lang: string;
  title: string;
  company: string;
  type: "Internship" | "Community";
  location: string;
  /** "YYYY-MM"; null end means ongoing */
  start: string;
  end: string | null;
  description?: string;
  stack: string[];
  icon: ComponentType<{ className?: string }>;
  bar: string;
  /** Short label for the timeline bar */
  short: string;
}

const roles: Role[] = [
  {
    file: "simplifytech.tsx",
    lang: "TypeScript React",
    title: "Full Stack Developer Intern",
    company: "SimplifyTech In",
    type: "Internship",
    location: "Virtual",
    start: "2025-02",
    end: null,
    description:
      "The internship focusing on New T3 stack(Next js, Next auth,prisma,Trpc and Tailwind css. Currently I'm working on the live client project,we are using the T3 tech stack for it and AWS for database,this is the advance live project includes both front-end and back-end development fully",
    stack: ["Next.js", "NextAuth", "Prisma", "tRPC", "Tailwind CSS", "AWS"],
    icon: Briefcase,
    bar: "from-brand-1 to-brand-2",
    short: "SimplifyTech",
  },
  {
    file: "o1-coding-club.py",
    lang: "Python",
    title: "Backend Development Intern",
    company: "O(1) Coding Club",
    type: "Internship",
    location: "Virtual",
    start: "2023-07",
    end: "2024-02",
    description: "The internship focused on Django Backend Development",
    stack: ["Python", "Django"],
    icon: Code2,
    bar: "from-brand-2 to-brand-3",
    short: "O(1)",
  },
  {
    file: "gdsc-au.md",
    lang: "Markdown",
    title: "Member",
    company: "Google Developers Students Clubs (GDSCAU)",
    type: "Community",
    location: "Anurag University",
    start: "2023-05",
    end: null,
    stack: ["Community", "Events", "Peer learning"],
    icon: Users,
    bar: "from-brand-3 to-brand-4",
    short: "GDSC AU",
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const label = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
const nowYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const duration = (start: string, end: string | null) => {
  const months = toIndex(end ?? nowYm()) - toIndex(start) + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ");
};

const fileIcon = (file: string) => (file.endsWith(".md") ? FileText : FileCode2);

/** Horizontal timeline of every role between the first start date and today. */
const RoleTimeline = ({ active, onSelect }: { active: number; onSelect: (i: number) => void }) => {
  const { from, to, years } = useMemo(() => {
    const firstYear = Math.min(...roles.map((r) => Number(r.start.slice(0, 4))));
    const lastYear = new Date().getFullYear();
    return {
      from: firstYear * 12,
      to: (lastYear + 1) * 12,
      years: Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i),
    };
  }, []);
  const pct = (i: number) => ((i - from) / (to - from)) * 100;
  const nowPct = pct(toIndex(nowYm()) + 0.5);

  return (
    <div className="border-t border-border/60 px-4 pb-5 pt-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between font-mono text-[0.68rem] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-brand-1" /> timeline
        </span>
        <span className="hidden sm:inline">tap a bar</span>
      </div>
      <div className="relative">
        {/* Year grid */}
        <div className="absolute inset-0 flex">
          {years.map((y) => (
            <div key={y} className="relative flex-1 border-l border-dashed border-border/70 first:border-l-0">
              <span className="absolute -bottom-5 left-1 font-mono text-[0.65rem] text-muted-foreground">{y}</span>
            </div>
          ))}
        </div>
        {/* "Now" marker */}
        <div className="absolute -top-1 bottom-0 w-px bg-brand-1/70" style={{ left: `${nowPct}%` }}>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded bg-brand-1/15 px-1 font-mono text-[0.6rem] font-bold text-brand-1">
            now
          </span>
        </div>
        <div className="relative flex flex-col gap-2 py-2">
          {roles.map((role, i) => {
            const left = pct(toIndex(role.start));
            const right = role.end ? pct(toIndex(role.end) + 1) : nowPct;
            return (
              <button
                key={role.file}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`${role.title} at ${role.company}`}
                className="relative h-6 w-full rounded-full text-left"
              >
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "absolute top-0 flex h-full origin-left items-center overflow-hidden rounded-full bg-gradient-to-r px-2 transition-all duration-300",
                    role.bar,
                    i === active ? "opacity-100 shadow-glow-1 ring-2 ring-foreground/30" : "opacity-50 hover:opacity-80"
                  )}
                  style={{ left: `${left}%`, width: `${right - left}%` }}
                >
                  <span className="truncate font-mono text-[0.62rem] font-bold text-on-grad">{role.short}</span>
                  {!role.end && (
                    <span className="absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 animate-pulse rounded-full bg-on-grad/80" />
                  )}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-4" />
    </div>
  );
};

const Experience = () => {
  const [active, setActive] = useState(0);
  const role = roles[active];
  const RoleIcon = role.icon;

  return (
    <section className="relative py-16 sm:py-24 lg:py-28" id="experience">
      <div className="container">
        <SectionHeading
          index="02"
          eyebrow="experience"
          title="Experience & Activities"
          subtitle="Shipping real products, learning from real teams. Open a file to read the details."
        />

        <ScrollReveal3D tilt={25} className="mx-auto max-w-5xl">
          <div className="gradient-border is-active relative overflow-hidden rounded-[1.75rem]">
            <div className="glass absolute inset-0" />

            <div className="relative">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 truncate font-mono text-xs text-muted-foreground">~/nikhil/career</span>
              </div>

              <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
                {/* Explorer (desktop) */}
                <nav aria-label="Roles" className="hidden border-r border-border/60 p-3 lg:block">
                  <p className="px-2 pb-2 pt-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    Explorer
                  </p>
                  <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
                    {roles.map((r, i) => {
                      const Icon = fileIcon(r.file);
                      return (
                        <button
                          key={r.file}
                          role="tab"
                          aria-selected={i === active}
                          aria-controls="experience-panel"
                          onClick={() => setActive(i)}
                          className={cn(
                            "relative isolate flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                            i === active ? "text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          {i === active && (
                            <motion.span
                              layoutId="exp-explorer"
                              transition={{ type: "spring", stiffness: 400, damping: 32 }}
                              className="absolute inset-0 -z-10 rounded-xl bg-muted ring-1 ring-brand-1/40"
                            />
                          )}
                          <span className="flex items-center gap-2 font-mono text-[0.78rem] font-semibold">
                            <Icon className="h-4 w-4 text-brand-1" />
                            {r.file}
                          </span>
                          <span className="pl-6 text-[0.72rem]">
                            {label(r.start)} – {r.end ? label(r.end) : "now"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </nav>

                <div className="min-w-0">
                  {/* Tabs (phones/tablets) */}
                  <div
                    role="tablist"
                    className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 pt-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
                  >
                    {roles.map((r, i) => {
                      const Icon = fileIcon(r.file);
                      return (
                        <button
                          key={r.file}
                          role="tab"
                          aria-selected={i === active}
                          aria-controls="experience-panel"
                          onClick={() => setActive(i)}
                          className={cn(
                            "relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 font-mono text-xs transition-colors",
                            i === active ? "bg-muted text-foreground" : "text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-brand-1" />
                          {r.file}
                          {i === active && (
                            <motion.span layoutId="exp-tab" className="bg-candy absolute inset-x-0 top-0 h-0.5 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active role */}
                  <div id="experience-panel" role="tabpanel" className="relative min-h-[22rem] p-5 sm:p-7">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={role.file}
                        initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="mb-5 flex flex-wrap items-center gap-2">
                          <span className="chip text-brand-1">{role.type}</span>
                          {!role.end && (
                            <span className="chip text-brand-4">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
                              </span>
                              Current
                            </span>
                          )}
                          <span className="chip text-muted-foreground">{duration(role.start, role.end)}</span>
                        </div>

                        <div className="flex items-start gap-4">
                          <span
                            className={cn(
                              "hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-on-grad shadow-glow-1 sm:flex",
                              role.bar
                            )}
                          >
                            <RoleIcon className="h-7 w-7" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{role.title}</h3>
                            <p className="mt-1 text-lg font-semibold text-brand-1">{role.company}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-brand-2" />
                            {label(role.start)} – {role.end ? label(role.end) : "Present"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-brand-2" />
                            {role.location}
                          </span>
                        </div>

                        {role.description && (
                          <p className="mt-5 max-w-2xl border-l-2 border-brand-1/50 pl-4 leading-relaxed text-foreground/80">
                            {role.description}
                          </p>
                        )}

                        <div className="mt-6">
                          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                            {role.type === "Community" ? "Involvement" : "Tech used"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {role.stack.map((t, i) => (
                              <motion.span
                                key={t}
                                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.12 + i * 0.05 }}
                                className="rounded-lg border border-border bg-background/50 px-3 py-1.5 font-mono text-xs font-medium"
                              >
                                {t}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <RoleTimeline active={active} onSelect={setActive} />

                  {/* Status bar */}
                  <div className="bg-candy flex items-center justify-between gap-3 px-4 py-1.5 font-mono text-[0.65rem] font-semibold text-on-grad sm:px-5">
                    <span className="truncate">● main · {role.file}</span>
                    <span className="shrink-0">{role.lang}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal3D>
      </div>
    </section>
  );
};

export default Experience;
