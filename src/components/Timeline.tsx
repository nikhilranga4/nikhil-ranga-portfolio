import { useRef, type ComponentType } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  period: string;
  meta?: string[];
  description?: string;
  accent: 1 | 2 | 3 | 4;
}

const ACCENTS = {
  1: { orb: "from-brand-1 to-brand-2", text: "text-brand-1", glow: "shadow-glow-1", ring: "bg-brand-1" },
  2: { orb: "from-brand-2 to-brand-3", text: "text-brand-2", glow: "shadow-glow-2", ring: "bg-brand-2" },
  3: { orb: "from-brand-3 to-brand-4", text: "text-brand-3", glow: "shadow-glow-3", ring: "bg-brand-3" },
  4: { orb: "from-brand-4 to-brand-3", text: "text-brand-4", glow: "shadow-glow-3", ring: "bg-brand-4" },
};

const Timeline = ({ items }: { items: TimelineItem[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 24 });

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl">
      {/* Track + animated gradient fill */}
      <div className="absolute bottom-0 left-6 top-0 w-1 -translate-x-1/2 rounded-full bg-muted md:left-1/2" />
      <motion.div
        style={{ scaleY }}
        className="absolute bottom-0 left-6 top-0 w-1 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-brand-1 via-brand-2 to-brand-3 shadow-glow-1 md:left-1/2"
      />

      <div className="flex flex-col gap-10 md:gap-16">
        {items.map((item, index) => {
          const accent = ACCENTS[item.accent];
          const right = index % 2 === 1;
          const Icon = item.icon;

          return (
            <div
              key={item.title + item.period}
              className="relative grid grid-cols-[3rem_1fr] items-start gap-5 md:grid-cols-[1fr_4rem_1fr] md:gap-0"
            >
              {/* Node with ripple */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="relative z-10 col-start-1 row-start-1 md:col-start-2 md:mx-auto"
              >
                <span className={cn("absolute inset-0 animate-pulse-ring rounded-2xl opacity-60", accent.ring)} />
                <span
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-on-grad md:h-14 md:w-14",
                    accent.orb,
                    accent.glow
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
              </motion.div>

              {/* Card — scroll-scrubbed 3D swing-in */}
              <ScrollReveal3D
                direction={right ? 1 : -1}
                className={cn("col-start-2 row-start-1", right ? "md:col-start-3 md:pl-6" : "md:col-start-1 md:pr-6")}
              >
                <TiltCard max={8}>
                  <div className="gradient-border relative rounded-3xl p-6 preserve-3d sm:p-7">
                    <div className="glass absolute inset-0 rounded-3xl" />
                    <div className="relative [transform:translateZ(36px)]">
                      <span className={cn("chip mb-4", accent.text)}>{item.period}</span>
                      <h3 className="mb-1 font-display text-xl font-bold leading-snug sm:text-2xl">{item.title}</h3>
                      <p className="mb-3 font-medium text-foreground/80">{item.subtitle}</p>
                      {item.meta && item.meta.length > 0 && (
                        <div className="mb-1 flex flex-wrap gap-2">
                          {item.meta.map((m) => (
                            <span key={m} className="chip text-muted-foreground">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.description && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </ScrollReveal3D>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
