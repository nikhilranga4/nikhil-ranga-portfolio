import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Briefcase, Code2, Cpu, GraduationCap, Globe, RotateCw, Smartphone, Users } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

const STATEMENT =
  "I craft playful, high-performance web & mobile experiences — from pixel-perfect React interfaces and cross-platform React Native apps to Node.js backends and AI/ML experiments. I love turning ideas into products people genuinely enjoy using.";

/** Words that glow in the palette gradient once lit */
const HIGHLIGHTS = new Set(["playful,", "React", "React Native", "Node.js", "AI/ML", "enjoy"]);

// Keep multi-word highlights together as one token
const TOKENS = STATEMENT.replace("React Native", "React Native").split(" ");

const FACTS = [
  { icon: GraduationCap, label: "Education", value: "BTech CSE (AI & ML) · 2024" },
  { icon: Briefcase, label: "Currently", value: "Full Stack Dev Intern @ SimplifyTech In" },
  { icon: Users, label: "Community", value: "Member, GDSC · Anurag University" },
  { icon: Code2, label: "Toolkit", value: "React · React Native · Node.js · Python" },
];

const SERVICES = [
  {
    icon: Globe,
    title: "Web Apps",
    desc: "Fast, responsive front-ends and full-stack web apps.",
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    icon: Smartphone,
    title: "Mobile Apps",
    desc: "Cross-platform apps with smooth animations.",
    tags: ["React Native", "Expo"],
  },
  {
    icon: Cpu,
    title: "Backend & AI",
    desc: "APIs, databases and machine-learning experiments.",
    tags: ["Node.js", "Django", "Python"],
  },
];

// Deterministic "barcode" stripes for the ID card
const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1];

const Word = ({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) => {
  const opacity = useTransform(progress, range, [0.15, 1]);
  const y = useTransform(progress, range, [8, 0]);
  const highlight = HIGHLIGHTS.has(word.replace(" ", " "));

  return (
    <motion.span style={{ opacity, y }} className={cn("mr-[0.26em] inline-block", highlight && "text-gradient")}>
      {word}
    </motion.span>
  );
};

/** A developer ID badge that flips in 3D (hover on desktop, tap on touch) to reveal quick facts. */
const IdCard = ({ sway }: { sway: MotionValue<number> }) => {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();
  const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <motion.div style={reduceMotion ? undefined : { rotateY: sway, transformPerspective: 1200 }}>
        <TiltCard max={6} glare={false}>
          <div
            className="relative h-[27rem] cursor-pointer [perspective:1400px]"
            onMouseEnter={() => canHover && setFlipped(true)}
            onMouseLeave={() => canHover && setFlipped(false)}
            onClick={() => !canHover && setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label="Developer ID card — flip for quick facts"
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setFlipped((f) => !f))}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="relative h-full w-full preserve-3d"
            >
              {/* Front */}
              <div className="gradient-border is-active absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] backface-hidden">
                <div className="glass absolute inset-0" />
                <div className="bg-candy relative h-28 animate-gradient-x">
                  <div className="noise absolute inset-0 opacity-20 mix-blend-overlay" />
                  <div className="absolute left-1/2 top-3 h-2 w-14 -translate-x-1/2 rounded-full bg-background/60" />
                  <p className="absolute left-5 top-8 font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/85">
                    Developer ID
                  </p>
                  <p className="absolute right-5 top-8 font-mono text-[0.65rem] font-bold text-white/85">
                    #{new Date().getFullYear()}
                  </p>
                </div>

                <div className="relative -mt-12 flex flex-col items-center px-6 text-center">
                  <div className="relative">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-1/40" />
                    <div className="bg-candy relative flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-extrabold text-white shadow-glow-1 ring-4 ring-background">
                      NR
                    </div>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold">Nikhil Ranga</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Full Stack Developer · AI/ML</p>
                  <span className="chip mt-3 text-brand-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-4" />
                    Available for work
                  </span>

                  <div className="mt-5 grid w-full grid-cols-2 gap-3 border-t border-dashed border-border pt-4">
                    <div>
                      <p className="text-gradient font-display text-2xl font-extrabold">11</p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div>
                      <p className="text-gradient font-display text-2xl font-extrabold">20+</p>
                      <p className="text-xs text-muted-foreground">Technologies</p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-auto flex items-end justify-between px-6 pb-5">
                  <div className="flex h-8 items-end gap-[2px]" aria-hidden>
                    {BARCODE.map((w, i) => (
                      <span key={i} className="h-full bg-foreground/70" style={{ width: w }} />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">@nikhilranga4</span>
                </div>
              </div>

              {/* Back */}
              <div className="gradient-border is-active absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] backface-hidden [transform:rotateY(180deg)]">
                <div className="glass absolute inset-0" />
                <div className="relative flex h-full flex-col p-6">
                  <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-brand-1">Quick facts</p>
                  <p className="mt-1 font-display text-xl font-bold">A bit more about me</p>
                  <ul className="mt-5 flex flex-col gap-4">
                    {FACTS.map(({ icon: Icon, label, value }) => (
                      <li key={label} className="flex items-start gap-3">
                        <span className="bg-candy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-glow-1">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                            {label}
                          </span>
                          <span className="block text-sm font-semibold leading-snug">{value}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
                    <RotateCw className="h-3 w-3" /> flip back
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </TiltCard>
      </motion.div>
      <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-xs text-muted-foreground">
        <RotateCw className="h-3.5 w-3.5" />
        {canHover ? "Hover" : "Tap"} the card to flip it
      </p>
    </div>
  );
};

const About = () => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: textRef, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  // The ID card sways gently as the section scrolls past
  const { scrollYProgress: sectionProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const sway = useSpring(useTransform(sectionProgress, [0, 1], [-14, 14]), { stiffness: 60, damping: 20 });

  return (
    <section ref={sectionRef} id="about" className="relative py-24 sm:py-32">
      <div className="container">
        <SectionHeading index="00" eyebrow="about" title="Hello, World!" bgText="about me" />

        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
          <ScrollReveal3D tilt={25}>
            <IdCard sway={sway} />
          </ScrollReveal3D>

          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-brand-1">// who I am</p>
            <p
              ref={textRef}
              className="font-display text-2xl font-semibold leading-snug sm:text-3xl lg:text-[2rem] lg:leading-[1.3]"
            >
              {TOKENS.map((word, i) => {
                const start = i / TOKENS.length;
                const end = start + 1 / TOKENS.length;
                return <Word key={i} word={word} progress={progress} range={[start, end]} />;
              })}
            </p>

            <p className="mb-4 mt-12 font-mono text-xs uppercase tracking-[0.25em] text-brand-1">// what I do</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {SERVICES.map(({ icon: Icon, title, desc, tags }, i) => (
                <ScrollReveal3D key={title} direction={i === 0 ? -1 : i === 2 ? 1 : 0} tilt={40} className="h-full">
                  <TiltCard max={10}>
                    <div className="gradient-border relative h-full rounded-3xl p-5 preserve-3d">
                      <div className="glass absolute inset-0 rounded-3xl" />
                      <div className="relative flex h-full flex-col [transform:translateZ(28px)]">
                        <span className="bg-candy mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-glow-1">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="font-display text-lg font-bold">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                          {tags.map((t) => (
                            <span key={t} className="chip text-[0.65rem] text-brand-3">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </ScrollReveal3D>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
