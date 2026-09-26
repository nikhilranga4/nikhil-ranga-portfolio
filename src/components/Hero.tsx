import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Briefcase, FileText, Github, Linkedin, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/theme-provider";
import { Magnetic } from "@/components/ui/magnetic";
import Marquee from "@/components/ui/marquee";
import { BentoTile } from "@/components/hero/BentoTile";
import TechOrbit from "@/components/hero/TechOrbit";

// Start fetching the 3D chunk immediately so it's ready by the time the loader finishes
const heroSceneImport = import("@/components/three/HeroScene");
const HeroScene = lazy(() => heroSceneImport);

const ROLES = ["Full Stack Developer", "AI/ML Engineer", "React Native Dev", "Creative Coder"];
const NAME = ["Nikhil", "Ranga"];

const SOCIALS = [
  { href: "https://github.com/nikhilranga4", label: "GitHub", icon: Github },
  { href: "https://www.linkedin.com/in/nikhilranga21", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:nikhilranga43@gmail.com", label: "Email", icon: Mail },
];

/** Gradient-orb fallback while the 3D chunk loads, or if WebGL is unavailable. */
const SceneFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-40 w-40 animate-float rounded-full bg-candy opacity-80 blur-2xl" />
  </div>
);

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children;
  }
}

function useTypewriter(words: string[]) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index % words.length];
    const done = !deleting && text === word;
    const cleared = deleting && text === "";
    const delay = done ? 1600 : deleting ? 40 : 85;

    const t = setTimeout(() => {
      if (done) setDeleting(true);
      else if (cleared) {
        setDeleting(false);
        setIndex((i) => i + 1);
      } else {
        setText(word.slice(0, text.length + (deleting ? -1 : 1)));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, index, words]);

  return text;
}

/** Number that counts up from 0 on mount. */
const CountUp = ({ to, suffix = "", delay = 0 }: { to: number; suffix?: string; delay?: number }) => {
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    const controls = animate(value, to, { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, to, delay]);
  return <motion.span>{rounded}</motion.span>;
};

const PulseDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
  </span>
);

const Hero = () => {
  const [showResume, setShowResume] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const role = useTypewriter(ROLES);
  const isMobile = useIsMobile();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Scroll-out: once the whole hero has been seen, the bento tiles drift apart as it leaves
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["end end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.4 });
  const spread = isMobile ? 0.35 : 1;
  const explode = (x: number, y: number, r: number): [number, number, number] => [x * spread, y * spread, r];

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  let letterIndex = 0;

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative flex items-center overflow-hidden pb-16 pt-24 lg:min-h-[100svh] lg:pt-28"
    >
      <div className="container relative grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
        {/* ── Intro ─────────────────────────────────────────── */}
        <BentoTile
          index={0}
          progress={progress}
          explode={explode(-220, -60, -6)}
          tilt={4}
          className="col-span-2 lg:col-span-7 lg:row-span-2"
          innerClassName="flex flex-col justify-center p-6 sm:p-9 xl:p-11"
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="chip px-3.5 py-1.5 text-xs text-foreground sm:text-sm">
              <span className="inline-block origin-[70%_70%] animate-wiggle [animation-delay:1.2s] [animation-iteration-count:3]">
                👋
              </span>
              Hey there, I&apos;m
            </span>
            <span className="chip px-3.5 py-1.5 text-xs text-brand-4 sm:text-sm">
              <PulseDot />
              Available for work
            </span>
          </div>

          <h1 className="perspective mb-4 font-display text-[clamp(3.1rem,15vw,4.75rem)] font-extrabold leading-[0.92] tracking-tight sm:text-7xl xl:text-[6.5rem]">
            {NAME.map((word, w) => (
              <span key={word} className={`block ${w === 1 ? "text-gradient" : ""}`}>
                {word.split("").map((char) => {
                  const i = letterIndex++;
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 80, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.35 + i * 0.05 }}
                      whileHover={{ y: -14, rotate: i % 2 ? 8 : -8, scale: 1.12 }}
                      className="inline-block origin-bottom cursor-default"
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mb-5 min-h-[1.75em] font-mono text-base font-medium sm:text-xl"
          >
            <span className="text-brand-2">&gt;</span> <span className="text-foreground">{role}</span>
            <span className="ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-1 animate-pulse bg-brand-1" />
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Passionate full-stack developer with expertise in React and React Native, dedicated to creating
            innovative web and mobile solutions. Committed to continuous learning and delivering high-quality,
            user-centric applications.
          </motion.p>
        </BentoTile>

        {/* ── Live 3D scene ─────────────────────────────────── */}
        <BentoTile
          index={1}
          progress={progress}
          explode={explode(240, -60, 8)}
          tilt={8}
          className="col-span-2 h-64 sm:h-80 lg:col-span-5 lg:row-span-2 lg:h-auto lg:min-h-[26rem]"
          innerClassName="overflow-hidden rounded-[2rem]"
        >
          <div className="absolute inset-0">
            <SceneBoundary>
              <Suspense fallback={<SceneFallback />}>
                <HeroScene active={inView} compact={isMobile} colors={colors} />
              </Suspense>
            </SceneBoundary>
          </div>
          <span className="chip pointer-events-none absolute left-4 top-4 text-brand-3">// live 3D</span>
          <span className="chip pointer-events-none absolute bottom-4 right-4 hidden text-muted-foreground sm:inline-flex">
            move your mouse ✦
          </span>
        </BentoTile>

        {/* ── Now ───────────────────────────────────────────── */}
        <BentoTile
          index={2}
          progress={progress}
          explode={explode(-200, 160, -10)}
          className="col-span-1 lg:col-span-3"
          innerClassName="flex flex-col justify-between gap-4 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
              <PulseDot />
              Now
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-1 to-brand-2 text-white shadow-glow-1">
              <Briefcase className="h-4 w-4" />
            </span>
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight sm:text-lg">Full Stack Developer Intern</p>
            <p className="mt-1 text-sm font-medium text-brand-1">@ SimplifyTech In</p>
            <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">Feb 2025 – now · T3 stack</p>
          </div>
        </BentoTile>

        {/* ── Stats ─────────────────────────────────────────── */}
        <BentoTile
          index={3}
          progress={progress}
          explode={explode(-40, 220, 6)}
          className="col-span-1 lg:col-span-2"
          innerClassName="flex flex-col justify-center gap-4 p-5 sm:p-6"
        >
          <div>
            <p className="text-gradient font-display text-4xl font-extrabold leading-none sm:text-5xl">
              <CountUp to={11} delay={0.8} />
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Projects shipped</p>
          </div>
          <div>
            <p className="text-gradient font-display text-4xl font-extrabold leading-none sm:text-5xl">
              <CountUp to={20} suffix="+" delay={1} />
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">Technologies</p>
          </div>
        </BentoTile>

        {/* ── Tech orbit ────────────────────────────────────── */}
        <BentoTile
          index={4}
          progress={progress}
          explode={explode(60, 240, -8)}
          tilt={8}
          className="col-span-2 h-56 lg:col-span-4 lg:h-auto lg:min-h-[13rem]"
          innerClassName="overflow-hidden rounded-[2rem]"
        >
          <TechOrbit />
          <span className="chip pointer-events-none absolute left-4 top-4 text-brand-2">// my stack</span>
        </BentoTile>

        {/* ── CTA ───────────────────────────────────────────── */}
        <BentoTile
          index={5}
          progress={progress}
          explode={explode(240, 180, 10)}
          className="col-span-2 lg:col-span-3"
          innerClassName="flex flex-col justify-between gap-5 overflow-hidden rounded-[2rem] p-5 sm:p-6"
        >
          <div className="-mx-5 -mt-1 sm:-mx-6">
            <Marquee className="p-0 [--duration:14s] [--gap:1rem]" repeat={4}>
              {["OPEN TO WORK", "LET'S BUILD", "SAY HI"].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-4 whitespace-nowrap font-display text-xs font-bold tracking-widest text-brand-1"
                >
                  {t} <span aria-hidden>✦</span>
                </span>
              ))}
            </Marquee>
          </div>

          <Magnetic className="w-full" strength={0.2}>
            <motion.button
              type="button"
              onClick={() => setShowResume(true)}
              whileTap={{ scale: 0.95 }}
              className="bg-candy group relative flex w-full animate-gradient-x items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-4 font-display text-base font-bold text-white shadow-glow-1 lg:text-sm xl:text-base"
            >
              <FileText className="h-5 w-5 shrink-0 transition-transform group-hover:-rotate-12" />
              View Resume
              <Sparkles className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-45 group-hover:scale-125 lg:hidden xl:block" />
            </motion.button>
          </Magnetic>

          <div className="grid grid-cols-3 gap-2.5">
            {SOCIALS.map(({ href, label, icon: Icon }, i) => (
              <motion.a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 1.2 + i * 0.1 }}
                whileHover={{ y: -4, rotate: -6 }}
                whileTap={{ scale: 0.9 }}
                className="group/s relative flex h-12 items-center justify-center rounded-xl border border-border bg-background/50 text-foreground transition-colors hover:border-brand-1 hover:text-brand-1 hover:shadow-glow-1"
              >
                <Icon className="h-5 w-5" />
                <ArrowUpRight className="absolute right-1.5 top-1.5 h-3 w-3 opacity-0 transition-opacity group-hover/s:opacity-100" />
              </motion.a>
            ))}
          </div>
        </BentoTile>
      </div>

      <Dialog open={showResume} onOpenChange={setShowResume}>
        <DialogContent
          data-lenis-prevent
          className="glass max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border-0 p-3 sm:p-4"
        >
          <DialogTitle className="px-2 pt-1 font-display text-xl">
            <span className="text-gradient">Resume</span>
          </DialogTitle>
          <img src="/NR-resume.png" alt="Nikhil Ranga's resume" className="w-full rounded-2xl" />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Hero;
