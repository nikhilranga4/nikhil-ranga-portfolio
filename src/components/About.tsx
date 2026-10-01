import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Briefcase, Code2, GraduationCap, RotateCw, Users } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import WhoAmIChat from "@/components/about/WhoAmIChat";
import WhatIDo from "@/components/about/WhatIDo";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";


const FACTS = [
  { icon: GraduationCap, label: "Education", value: "BTech CSE (AI & ML) · 2024" },
  { icon: Briefcase, label: "Currently", value: "Full Stack Dev Intern @ SimplifyTech In" },
  { icon: Users, label: "Community", value: "Member, GDSC · Anurag University" },
  { icon: Code2, label: "Toolkit", value: "React · React Native · Node.js · Python" },
];


// Deterministic "barcode" stripes for the ID card
const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1];

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
                  <p className="absolute left-5 top-8 font-mono text-[0.65rem] font-bold uppercase tracking-[0.25em] text-on-grad/85">
                    Developer ID
                  </p>
                  <p className="absolute right-5 top-8 font-mono text-[0.65rem] font-bold text-on-grad/85">
                    #{new Date().getFullYear()}
                  </p>
                </div>

                <div className="relative -mt-12 flex flex-col items-center px-6 text-center">
                  <div className="relative">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-1/40" />
                    <div className="bg-candy relative flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-extrabold text-on-grad shadow-glow-1 ring-4 ring-background">
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
                        <span className="bg-candy flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-grad shadow-glow-1">
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
  const sectionRef = useRef<HTMLElement>(null);

  // The ID card sways gently as the section scrolls past
  const { scrollYProgress: sectionProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const sway = useSpring(useTransform(sectionProgress, [0, 1], [-14, 14]), { stiffness: 60, damping: 20 });

  return (
    <section ref={sectionRef} id="about" className="relative py-16 sm:py-24 lg:py-28">
      <div className="container">
        <SectionHeading index="00" eyebrow="about" title="Hello, World!" bgText="about me" />

        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
          <ScrollReveal3D tilt={25}>
            <IdCard sway={sway} />
          </ScrollReveal3D>

          <div>
            <WhoAmIChat />
          </div>
        </div>

        <WhatIDo />
      </div>
    </section>
  );
};

export default About;
