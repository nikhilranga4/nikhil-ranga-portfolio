import { useEffect, useRef, type ComponentType } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { BookOpen, Calendar, GraduationCap, MapPin, School, Sparkles } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

interface Stage {
  level: string;
  school: string;
  degree: string;
  period: string;
  location: string;
  score: { label: string; value: number; max: number; decimals: number; suffix?: string };
  icon: ComponentType<{ className?: string }>;
  tint: string;
  latest?: boolean;
}

// Oldest first, so the path reads as a progression
const stages: Stage[] = [
  {
    level: "01",
    school: "Geethanjali High School",
    degree: "SSC",
    period: "2017 – 2018",
    location: "Nagarkurnool",
    score: { label: "GPA", value: 8.5, max: 10, decimals: 1 },
    icon: School,
    tint: "from-brand-3 to-brand-4",
  },
  {
    level: "02",
    school: "Vishra Junior College",
    degree: "Intermediate, MPC",
    period: "2018 – 2020",
    location: "Hyderabad",
    score: { label: "Grade", value: 71, max: 100, decimals: 0, suffix: "%" },
    icon: BookOpen,
    tint: "from-brand-2 to-brand-5",
  },
  {
    level: "03",
    school: "Sreyas Institute of Engineering and Technology",
    degree: "BTech in Computer Science (AI & ML)",
    period: "2020 – 2024",
    location: "Hyderabad",
    score: { label: "CGPA", value: 7.13, max: 10, decimals: 2 },
    icon: GraduationCap,
    tint: "from-brand-1 to-brand-2",
    latest: true,
  },
];

const R = 42;
const C = 2 * Math.PI * R;

/** Circular score meter that fills and counts up the first time it scrolls into view. */
const ScoreRing = ({ score, id }: { score: Stage["score"]; id: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useMotionValue(0);
  const factor = 10 ** score.decimals;
  const text = useTransform(value, (v) => `${(Math.round(v * factor) / factor).toFixed(score.decimals)}${score.suffix ?? ""}`);
  const offset = useTransform(value, (v) => C * (1 - v / score.max));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, score.value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => value.set(score.value),
    });
    return () => controls.stop();
  }, [inView, score.value, value]);

  return (
    <div ref={ref} className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-1))" />
            <stop offset="100%" stopColor="hsl(var(--brand-2))" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-display text-2xl font-bold tabular-nums leading-none">{text}</motion.span>
        <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground">
          {score.label}
          {score.max === 10 ? " / 10" : ""}
        </span>
      </div>
    </div>
  );
};

const StageCard = ({ stage }: { stage: Stage }) => {
  const Icon = stage.icon;
  return (
    <TiltCard max={7}>
      <article
        className={cn(
          "gradient-border relative flex h-full flex-col rounded-[1.75rem] p-6 preserve-3d",
          stage.latest && "is-active"
        )}
      >
        <div className="glass absolute inset-0 rounded-[1.75rem]" />
        {/* Big faint level number in the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-4 font-display text-[6.5rem] font-extrabold leading-none text-foreground/[0.05]"
        >
          {stage.level}
        </span>

        <div className="relative flex h-full flex-col [transform:translateZ(30px)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-on-grad shadow-glow-1",
                stage.tint
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
            {stage.latest ? (
              <span className="bg-candy inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.72rem] font-bold text-on-grad">
                <Sparkles className="h-3 w-3" /> Latest
              </span>
            ) : (
              <span className="chip text-muted-foreground">Level {stage.level}</span>
            )}
          </div>

          <div className="mb-5 flex items-center gap-4">
            <ScoreRing score={stage.score} id={stage.level} />
            <div className="min-w-0">
              <p className="font-mono text-[0.65rem] uppercase tracking-widest text-brand-1">Level {stage.level}</p>
              <p className="mt-1 font-semibold leading-snug text-foreground/90">{stage.degree}</p>
            </div>
          </div>

          <h3 className="font-display text-xl font-bold leading-snug">{stage.school}</h3>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <span className="chip text-foreground/80">
              <Calendar className="h-3.5 w-3.5 text-brand-1" />
              {stage.period}
            </span>
            <span className="chip text-foreground/80">
              <MapPin className="h-3.5 w-3.5 text-brand-2" />
              {stage.location}
            </span>
          </div>
        </div>
      </article>
    </TiltCard>
  );
};

const Education = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackInView = useInView(trackRef, { once: true, amount: 0.3 });

  return (
    <section className="relative py-16 sm:py-24 lg:py-28" id="education">
      <div className="container">
        <SectionHeading
          index="01"
          eyebrow="education"
          title="Where I Learned"
          subtitle="Three levels unlocked so far: from school, to junior college, to a degree in AI & ML."
        />

        {/* Desktop journey track: level nodes joined by a glowing path that draws itself */}
        <div ref={trackRef} className="relative mx-auto mb-8 hidden max-w-6xl grid-cols-3 lg:grid">
          <div className="absolute left-[16.66%] right-[16.66%] top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: trackInView ? 1 : 0 }}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
            className="bg-candy absolute left-[16.66%] right-[16.66%] top-1/2 h-1 origin-left -translate-y-1/2 rounded-full shadow-glow-1"
          />
          {stages.map((stage, i) => (
            <div key={stage.level} className="relative flex justify-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: trackInView ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.3 + i * 0.45 }}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-bold ring-4 ring-background",
                  stage.latest ? "bg-candy text-on-grad shadow-glow-1" : "border border-border text-foreground"
                )}
                style={{ backgroundColor: stage.latest ? undefined : "hsl(var(--surface))" }}
              >
                {stage.latest && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-1/40" />}
                <span className="relative">{stage.level}</span>
              </motion.span>
            </div>
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3 lg:gap-6">
          {stages.map((stage, i) => (
            <div key={stage.level} className="flex flex-col">
              <ScrollReveal3D direction={i === 0 ? -1 : i === 2 ? 1 : 0} tilt={30} className="h-full">
                <StageCard stage={stage} />
              </ScrollReveal3D>
              {/* Phone/tablet connector to the next level */}
              {i < stages.length - 1 && (
                <div aria-hidden className="flex flex-col items-center py-1 lg:hidden">
                  <span className="h-6 w-px bg-gradient-to-b from-brand-1 to-transparent" />
                  <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">next level</span>
                  <span className="h-6 w-px bg-gradient-to-b from-transparent to-brand-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Education;
