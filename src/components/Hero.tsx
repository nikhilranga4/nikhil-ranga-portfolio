import { Component, Suspense, lazy, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { FileText, Github, Linkedin, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/theme-provider";
import { Magnetic } from "@/components/ui/magnetic";
import Marquee from "@/components/ui/marquee";
import { TiltCard } from "@/components/ui/tilt-card";

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

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";
const STACK = [
  { name: "React", icon: `${DEVICON}/react/react-original.svg` },
  { name: "TypeScript", icon: `${DEVICON}/typescript/typescript-original.svg` },
  { name: "JavaScript", icon: `${DEVICON}/javascript/javascript-original.svg` },
  { name: "Python", icon: `${DEVICON}/python/python-original.svg` },
  { name: "Node.js", icon: `${DEVICON}/nodejs/nodejs-original.svg` },
  { name: "MongoDB", icon: `${DEVICON}/mongodb/mongodb-original.svg` },
  { name: "Tailwind", icon: `${DEVICON}/tailwindcss/tailwindcss-original.svg` },
  { name: "Django", icon: `${DEVICON}/django/django-plain.svg` },
  { name: "Git", icon: `${DEVICON}/git/git-original.svg` },
  { name: "Figma", icon: `${DEVICON}/figma/figma-original.svg` },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.45 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

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
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
  </span>
);

const Hero = () => {
  const [showResume, setShowResume] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const role = useTypewriter(ROLES);
  const isMobile = useIsMobile();
  // Pull the camera back on desktop so the scene sits comfortably beside the copy
  const distanceFor = (w: number) => (w >= 1280 ? 9 : w >= 1024 ? 10.5 : undefined);
  const [sceneDistance, setSceneDistance] = useState(() => distanceFor(window.innerWidth));
  useEffect(() => {
    const update = () => setSceneDistance(distanceFor(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Once the whole hero has been seen, the card tips back and fades as it scrolls away
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["end end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.4 });
  const cardRotateX = useTransform(progress, [0, 1], [0, 16]);
  const cardScale = useTransform(progress, [0, 1], [1, 0.92]);
  const cardOpacity = useTransform(progress, [0, 1], [1, 0.4]);
  const cardY = useTransform(progress, [0, 1], [0, 60]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  let letterIndex = 0;

  return (
    <section ref={sectionRef} id="home" className="relative pb-12 pt-24 lg:pb-16 lg:pt-28">
      <div className="container">
        <motion.div
          style={
            reduceMotion
              ? undefined
              : { rotateX: cardRotateX, scale: cardScale, opacity: cardOpacity, y: cardY, transformPerspective: 1400 }
          }
          className="origin-top"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 60, rotateX: -18, scale: 0.94, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.1 }}
            style={{ transformPerspective: 1400 }}
          >
            <TiltCard max={3}>
              <div
                ref={surfaceRef}
                onPointerMove={onPointerMove}
                className="gradient-border group/hero relative flex flex-col overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] lg:min-h-[calc(100svh-9rem)]"
              >
                {/* Surface: glass, grid, glow blobs, cursor spotlight */}
                <div aria-hidden className="glass absolute inset-0" />
                <div aria-hidden className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
                <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-1/20 blur-3xl" />
                <div aria-hidden className="absolute -bottom-32 left-1/3 h-80 w-96 rounded-full bg-brand-3/15 blur-3xl" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/hero:opacity-100"
                  style={{
                    background:
                      "radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--brand-1) / 0.14), transparent 45%)",
                  }}
                />

                {/* 3D scene — a faded banner on top for mobile, blended into the right half on desktop */}
                <div
                  className="relative h-60 w-full [-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent)] [mask-image:linear-gradient(to_bottom,black_60%,transparent)] sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,black_30%)] lg:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
                >
                  <SceneBoundary>
                    <Suspense fallback={<SceneFallback />}>
                      <HeroScene key={sceneDistance ?? "auto"} active={inView} compact={isMobile} distance={sceneDistance} colors={colors} />
                    </Suspense>
                  </SceneBoundary>
                </div>

                {/* Copy */}
                <motion.div
                  variants={container}
                  initial={reduceMotion ? false : "hidden"}
                  animate="show"
                  className="relative z-10 -mt-10 flex flex-1 flex-col justify-center px-6 pb-8 sm:-mt-12 sm:px-10 lg:mt-0 lg:max-w-[56%] lg:py-14 lg:pl-14 xl:pl-16"
                >
                  <motion.div variants={item} className="mb-5 flex flex-wrap items-center gap-2">
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
                  </motion.div>

                  <h1 className="perspective mb-4 font-display text-[clamp(3.2rem,16vw,5rem)] font-extrabold leading-[0.9] tracking-tight sm:text-8xl xl:text-[7.5rem]">
                    {NAME.map((word, w) => (
                      <span key={word} className={`block ${w === 1 ? "text-gradient" : ""}`}>
                        {word.split("").map((char) => {
                          const i = letterIndex++;
                          return (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, y: 80, rotateX: -90 }}
                              animate={{ opacity: 1, y: 0, rotateX: 0 }}
                              transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.4 + i * 0.05 }}
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

                  <motion.p variants={item} className="mb-5 min-h-[1.75em] font-mono text-base font-medium sm:text-xl lg:text-2xl">
                    <span className="text-brand-2">&gt;</span> <span className="text-foreground">{role}</span>
                    <span className="ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-1 animate-pulse bg-brand-1" />
                  </motion.p>

                  <motion.p
                    variants={item}
                    className="mb-8 w-full text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl lg:leading-relaxed"
                  >
                    Passionate full-stack developer with expertise in React and React Native, dedicated to creating
                    innovative web and mobile solutions. Committed to continuous learning and delivering high-quality,
                    user-centric applications.
                  </motion.p>

                  <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Magnetic className="w-full sm:w-auto" strength={0.25}>
                      <motion.button
                        type="button"
                        onClick={() => setShowResume(true)}
                        whileTap={{ scale: 0.95 }}
                        className="bg-candy group relative flex w-full animate-gradient-x items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-7 py-4 font-display text-base font-bold text-white shadow-glow-1 sm:w-auto sm:rounded-full"
                      >
                        <FileText className="h-5 w-5 transition-transform group-hover:-rotate-12" />
                        View Resume
                        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-45 group-hover:scale-125" />
                      </motion.button>
                    </Magnetic>
                    <div className="grid grid-cols-3 gap-3 sm:flex">
                      {SOCIALS.map(({ href, label, icon: Icon }) => (
                        <motion.a
                          key={label}
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          aria-label={label}
                          whileHover={{ y: -4, rotate: -6 }}
                          whileTap={{ scale: 0.9 }}
                          className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background/50 text-foreground transition-colors hover:border-brand-1 hover:text-brand-1 hover:shadow-glow-1 sm:h-14 sm:w-14"
                        >
                          <Icon className="h-5 w-5" />
                        </motion.a>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Footer strip — current role, stats and stack, all inside the same card */}
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                  className="relative z-10 grid gap-5 border-t border-border/60 bg-background/30 px-6 py-5 backdrop-blur-sm sm:px-10 lg:grid-cols-[auto_auto_minmax(0,1fr)] lg:items-center lg:gap-8 lg:pl-14 xl:pl-16"
                >
                  <div className="flex items-center gap-3">
                    <PulseDot />
                    <div className="min-w-0">
                      <p className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">Currently</p>
                      <p className="text-sm font-semibold leading-tight">
                        Full Stack Developer Intern <span className="text-brand-1">@ SimplifyTech In</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 lg:flex lg:gap-8 lg:border-x lg:border-border/60 lg:px-8">
                    <div>
                      <p className="text-gradient font-display text-3xl font-extrabold leading-none">
                        <CountUp to={11} delay={1.4} />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Projects shipped</p>
                    </div>
                    <div>
                      <p className="text-gradient font-display text-3xl font-extrabold leading-none">
                        <CountUp to={20} suffix="+" delay={1.6} />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Technologies</p>
                    </div>
                  </div>

                  <div className="relative min-w-0 overflow-hidden [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                    <Marquee pauseOnHover className="p-0 [--duration:28s] [--gap:0.75rem]" repeat={3}>
                      {STACK.map((tech) => (
                        <span
                          key={tech.name}
                          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background/60 py-1.5 pl-1.5 pr-3.5 text-xs font-medium"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-1">
                            <img src={tech.icon} alt="" className="h-full w-full object-contain" loading="lazy" />
                          </span>
                          {tech.name}
                        </span>
                      ))}
                    </Marquee>
                  </div>
                </motion.div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
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
