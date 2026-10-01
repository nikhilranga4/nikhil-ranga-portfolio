import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Cpu, Globe, Plus, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  pitch: string;
  delivers: string[];
  tags: string[];
  proof: string;
  visual: ComponentType;
}

// ── Little animated illustrations, one per service ─────────────────────────

/** A browser whose page "builds" itself: header, hero block and cards fill in on a loop. */
const WebVisual = () => (
  <div className="w-full max-w-[17rem] overflow-hidden rounded-xl border border-border bg-background/80 shadow-xl">
    <div className="flex items-center gap-1.5 border-b border-border bg-muted/70 px-2.5 py-2">
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
      ))}
      <span className="ml-2 h-2.5 flex-1 rounded-full bg-background/80" />
    </div>
    <div className="flex flex-col gap-2 p-3">
      {[
        { w: "45%", h: "h-2.5", d: 0 },
        { w: "100%", h: "h-12", d: 0.3 },
      ].map((b, i) => (
        <motion.span
          key={i}
          className={cn("bg-candy block rounded-md", b.h)}
          initial={{ width: 0, opacity: 0.4 }}
          animate={{ width: [0, b.w, b.w, 0], opacity: [0.4, 1, 1, 0.4] }}
          transition={{ duration: 4, times: [0, 0.25, 0.85, 1], repeat: Infinity, delay: b.d }}
        />
      ))}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-10 rounded-md bg-muted ring-1 ring-border"
            animate={{ scale: [0.6, 1, 1, 0.6], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, times: [0, 0.3, 0.85, 1], repeat: Infinity, delay: 0.6 + i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
);

/** A phone with app cards sliding up through the screen. */
const MobileVisual = () => (
  <div className="relative h-56 w-28 rounded-[1.6rem] border border-border bg-foreground/85 p-1.5 shadow-xl">
    <div className="absolute left-1/2 top-2.5 z-10 h-2.5 w-10 -translate-x-1/2 rounded-full bg-black" />
    <div className="relative h-full overflow-hidden rounded-[1.25rem] bg-background">
      <motion.div
        className="flex flex-col gap-2 p-2 pt-6"
        animate={{ y: [0, -96] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-muted p-1.5 ring-1 ring-border">
            <span className={cn("h-6 w-6 shrink-0 rounded-md", i % 2 ? "bg-brand-2/70" : "bg-candy")} />
            <span className="flex flex-1 flex-col gap-1">
              <span className="h-1.5 w-4/5 rounded-full bg-foreground/30" />
              <span className="h-1.5 w-1/2 rounded-full bg-foreground/15" />
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  </div>
);

/** API → server → database nodes with data packets travelling between them. */
const BackendVisual = () => {
  const nodes = ["client", "api", "db"];
  return (
    <div className="flex w-full max-w-[18rem] flex-col gap-3">
      <div className="relative flex items-center justify-between">
        <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-border" />
        {[0, 1].map((seg) => (
          <motion.span
            key={seg}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-1 shadow-[0_0_12px_hsl(var(--brand-1))]"
            animate={{ left: seg === 0 ? ["12%", "46%"] : ["54%", "86%"], opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: seg * 0.7, ease: "easeInOut" }}
          />
        ))}
        {nodes.map((n) => (
          <span
            key={n}
            className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background/90 font-mono text-[0.65rem] font-bold shadow-lg"
          >
            {n}
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background/80 p-3 font-mono text-[0.65rem] leading-relaxed shadow-xl">
        <p>
          <span className="text-brand-2">POST</span> /api/bookings
        </p>
        <motion.p
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.2, 0.85, 1] }}
        >
          <span className="text-brand-4">201</span> {'{ status: "confirmed" }'}
        </motion.p>
      </div>
    </div>
  );
};

const SERVICES: Service[] = [
  {
    id: "web",
    title: "Web Apps",
    icon: Globe,
    pitch: "Fast, responsive front-ends and full-stack web apps that feel great on every screen.",
    delivers: ["Responsive React interfaces", "Full-stack MERN & T3 apps", "API integrations"],
    tags: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    proof: "4 web projects",
    visual: WebVisual,
  },
  {
    id: "mobile",
    title: "Mobile Apps",
    icon: Smartphone,
    pitch: "Cross-platform apps for Android and iOS with smooth, native-feeling animations.",
    delivers: ["React Native apps", "Gesture & card animations", "API-driven screens"],
    tags: ["React Native", "Expo", "Async Storage"],
    proof: "6 mobile projects",
    visual: MobileVisual,
  },
  {
    id: "backend",
    title: "Backend & AI",
    icon: Cpu,
    pitch: "APIs, databases and machine-learning experiments that power the product behind the UI.",
    delivers: ["Node.js & Django APIs", "MongoDB & MySQL data", "Computer-vision experiments"],
    tags: ["Node.js", "Express", "Django", "Python"],
    proof: "Django internship + AI/ML project",
    visual: BackendVisual,
  },
];

/**
 * "What I do" as expanding panels: on desktop three tall panels sit side by side and the active
 * one grows to reveal an animated illustration and details; on phones it's a tap-to-open accordion.
 */
const WhatIDo = () => {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-16 sm:mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand-1">// what I do</p>
          <h3 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Things I can build for you</h3>
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground lg:block">hover a panel to open it</p>
      </div>

      <div className="flex flex-col gap-3 lg:h-[26rem] lg:flex-row">
        {SERVICES.map((s, i) => {
          const open = i === active;
          const Icon = s.icon;
          const Visual = s.visual;
          return (
            <motion.div
              key={s.id}
              layout
              onMouseEnter={() => setActive(i)}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              className={cn(
                "gradient-border relative overflow-hidden rounded-[1.75rem]",
                open ? "is-active lg:flex-[3.2]" : "lg:flex-1",
              )}
            >
              <div className="glass absolute inset-0" />
              <div
                aria-hidden
                className={cn(
                  "absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl transition-opacity duration-500",
                  i === 0 ? "bg-brand-1/30" : i === 1 ? "bg-brand-2/30" : "bg-brand-3/30",
                  open ? "opacity-100" : "opacity-40",
                )}
              />

              {/* Header / toggle */}
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-expanded={open}
                className="relative flex w-full items-center gap-4 p-5 text-left lg:h-full lg:flex-col lg:items-start lg:justify-between"
              >
                <span className="flex items-center gap-4 lg:flex-col lg:items-start">
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
                      open ? "bg-candy text-on-grad shadow-glow-1" : "bg-muted text-foreground ring-1 ring-border",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </span>
                <span className="min-w-0 flex-1 lg:flex-none">
                  <span
                    className={cn(
                      "block font-display text-xl font-bold transition-all lg:origin-bottom-left",
                      open
                        ? "lg:hidden"
                        : "lg:absolute lg:bottom-6 lg:left-5 lg:w-[20rem] lg:translate-x-[2.4rem] lg:-rotate-90 lg:whitespace-nowrap lg:text-2xl",
                    )}
                  >
                    {s.title}
                  </span>
                </span>
                <Plus
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform lg:hidden",
                    open && "rotate-45 text-brand-1",
                  )}
                />
              </button>

              {/* Body */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden lg:absolute lg:inset-0 lg:!h-auto lg:pl-24"
                  >
                    <div className="grid gap-6 px-5 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:h-full lg:py-6 lg:pr-7">
                      <div className="min-w-0">
                        <h4 className="hidden font-display text-3xl font-bold lg:block">{s.title}</h4>
                        <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{s.pitch}</p>
                        <ul className="mt-4 flex flex-col gap-2">
                          {s.delivers.map((d, k) => (
                            <motion.li
                              key={d}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.15 + k * 0.07 }}
                              className="flex items-center gap-2.5 text-sm font-medium"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-1/15 text-brand-1">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                              {d}
                            </motion.li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {s.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-lg border border-border bg-background/50 px-2.5 py-1 font-mono text-[0.68rem]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <a
                          href="#projects"
                          className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-1"
                        >
                          See {s.proof}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.1 }}
                        className="flex justify-center sm:justify-end"
                      >
                        <Visual />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WhatIDo;
