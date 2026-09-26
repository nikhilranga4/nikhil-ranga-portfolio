import { useRef, type ComponentType } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  period: string;
  meta?: string[];
  description?: string;
  accent: "pink" | "violet" | "cyan" | "lime";
}

const ACCENTS = {
  pink: { orb: "from-neon-pink to-neon-violet", text: "text-neon-pink", glow: "shadow-glow-pink" },
  violet: { orb: "from-neon-violet to-neon-cyan", text: "text-neon-violet", glow: "shadow-glow-violet" },
  cyan: { orb: "from-neon-cyan to-neon-lime", text: "text-neon-cyan", glow: "shadow-glow-cyan" },
  lime: { orb: "from-neon-lime to-neon-cyan", text: "text-neon-lime", glow: "shadow-glow-cyan" },
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
        className="absolute bottom-0 left-6 top-0 w-1 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-neon-pink via-neon-violet to-neon-cyan shadow-glow-pink md:left-1/2"
      />

      <div className="flex flex-col gap-10 md:gap-16">
        {items.map((item, index) => {
          const accent = ACCENTS[item.accent];
          const right = index % 2 === 1;
          const Icon = item.icon;

          return (
            <div
              key={item.title + item.period}
              className={cn(
                "relative grid grid-cols-[3rem_1fr] items-start gap-5 md:grid-cols-[1fr_4rem_1fr] md:gap-0"
              )}
            >
              {/* Node */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className={cn(
                  "relative z-10 col-start-1 row-start-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white md:col-start-2 md:mx-auto md:h-14 md:w-14",
                  accent.orb,
                  accent.glow
                )}
              >
                <Icon className="h-6 w-6" />
              </motion.div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, x: right ? 80 : -80, rotateY: right ? -25 : 25 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: "spring", stiffness: 70, damping: 16 }}
                className={cn(
                  "col-start-2 row-start-1",
                  right ? "md:col-start-3 md:pl-6" : "md:col-start-1 md:pr-6"
                )}
              >
                <TiltCard max={8}>
                  <div className="gradient-border relative rounded-3xl p-6 preserve-3d sm:p-7">
                    <div className="glass absolute inset-0 rounded-3xl" />
                    <div className="relative [transform:translateZ(36px)]">
                      <span className={cn("chip mb-4", accent.text)}>{item.period}</span>
                      <h3 className="mb-1 font-display text-xl font-bold leading-snug sm:text-2xl">
                        {item.title}
                      </h3>
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
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
