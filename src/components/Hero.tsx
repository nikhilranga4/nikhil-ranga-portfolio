import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, FileText, Github, Linkedin, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/theme-provider";
import { Magnetic } from "@/components/ui/magnetic";

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

const FLOATING_CHIPS = [
  { label: "⚛️ React", className: "left-[38%] top-[3%]", delay: "0s", scatter: [-60, -220] },
  { label: "🐍 Python", className: "right-[0%] top-[62%]", delay: "-2s", scatter: [260, 40] },
  { label: "🤖 AI/ML", className: "left-[0%] top-[46%]", delay: "-4s", scatter: [-280, -60] },
  { label: "🟢 Node.js", className: "left-[36%] bottom-[2%]", delay: "-1s", scatter: [40, 220] },
];

/** A tech chip that floats in place, then flies outward as the hero scrolls away. */
const ScatterChip = ({
  chip,
  progress,
}: {
  chip: (typeof FLOATING_CHIPS)[number];
  progress: ReturnType<typeof useSpring>;
}) => {
  const x = useTransform(progress, [0, 1], [0, chip.scatter[0]]);
  const y = useTransform(progress, [0, 1], [0, chip.scatter[1]]);
  const rotate = useTransform(progress, [0, 1], [0, chip.scatter[0] > 0 ? 40 : -40]);
  return (
    <motion.span style={{ x, y, rotate }} className={`absolute ${chip.className}`}>
      <span
        className="chip glass block animate-float-3d px-4 py-2 text-sm text-foreground shadow-lg"
        style={{ animationDelay: chip.delay }}
      >
        {chip.label}
      </span>
    </motion.span>
  );
};

/** Gradient-orb fallback while the 3D chunk loads, or if WebGL is unavailable. */
const SceneFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-64 w-64 animate-float rounded-full bg-candy opacity-80 blur-2xl" />
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

const Hero = () => {
  const [showResume, setShowResume] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const role = useTypewriter(ROLES);
  const isMobile = useIsMobile();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Scroll-out choreography: copy lifts away, 3D scene shrinks and tilts back
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.4 });
  const copyY = useTransform(progress, [0, 1], [0, -180]);
  const copyOpacity = useTransform(progress, [0, 0.7], [1, 0]);
  const copyBlur = useTransform(progress, [0, 0.8], ["blur(0px)", "blur(8px)"]);
  const sceneScale = useTransform(progress, [0, 1], [1, 0.6]);
  const sceneRotateX = useTransform(progress, [0, 1], [0, 35]);
  const sceneY = useTransform(progress, [0, 1], [0, 160]);
  const sceneOpacity = useTransform(progress, [0.4, 1], [1, 0]);

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
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-20 lg:pt-28"
    >
      <div className="container relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* 3D scene — stacked above the copy on small screens */}
        <motion.div
          style={
            reduceMotion
              ? undefined
              : { scale: sceneScale, rotateX: sceneRotateX, y: sceneY, opacity: sceneOpacity, transformPerspective: 1000 }
          }
          className="relative -mx-5 h-[300px] sm:h-[400px] lg:order-2 lg:mx-0 lg:h-[600px]"
        >
          <SceneBoundary>
            <Suspense fallback={<SceneFallback />}>
              <HeroScene active={inView} compact={isMobile} colors={colors} />
            </Suspense>
          </SceneBoundary>
          <div className="hidden lg:block">
            {FLOATING_CHIPS.map((chip) => (
              <ScatterChip key={chip.label} chip={chip} progress={progress} />
            ))}
          </div>
        </motion.div>

        {/* Copy */}
        <motion.div
          style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity, filter: copyBlur }}
          className="relative z-10 -mt-6 text-center lg:order-1 lg:mt-0 lg:text-left"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="chip glass mb-6 px-4 py-2 text-sm text-foreground"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-4" />
            </span>
            <span>
              <span className="inline-block origin-[70%_70%] animate-wiggle [animation-delay:1s] [animation-iteration-count:3]">
                👋
              </span>{" "}
              Hey there, I&apos;m
            </span>
          </motion.div>

          <h1 className="perspective mb-5 font-display text-[3.4rem] font-extrabold leading-[0.95] sm:text-7xl xl:text-[6.5rem]">
            {NAME.map((word, w) => (
              <span key={word} className={`block ${w === 1 ? "text-gradient" : ""}`}>
                {word.split("").map((char) => {
                  const i = letterIndex++;
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 80, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.25 + i * 0.05 }}
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
            transition={{ delay: 0.9 }}
            className="mb-6 font-mono text-lg font-medium sm:text-2xl"
          >
            <span className="text-brand-2">&gt;</span>{" "}
            <span className="text-foreground">{role}</span>
            <span className="ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-1 animate-pulse bg-brand-1" />
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.6 }}
            className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            Passionate full-stack developer with expertise in React and React Native, dedicated to
            creating innovative web and mobile solutions. Committed to continuous learning and
            delivering high-quality, user-centric applications.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="flex flex-col items-center gap-5 sm:flex-row lg:justify-start sm:justify-center"
          >
            <Magnetic>
              <motion.button
                type="button"
                onClick={() => setShowResume(true)}
                whileTap={{ scale: 0.94 }}
                className="bg-candy group relative inline-flex animate-gradient-x items-center gap-2 rounded-full px-7 py-4 font-display text-base font-bold text-white shadow-glow-1"
              >
              <FileText className="h-5 w-5 transition-transform group-hover:-rotate-12" />
              View Resume
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-45 group-hover:scale-125" />
              </motion.button>
            </Magnetic>

            <div className="flex gap-3">
              {SOCIALS.map(({ href, label, icon: Icon }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, delay: 1.35 + i * 0.1 }}
                  whileHover={{ y: -6, rotate: -8 }}
                  whileTap={{ scale: 0.9 }}
                  className="glass flex h-14 w-14 items-center justify-center rounded-2xl text-foreground transition-colors hover:border-brand-1 hover:text-brand-1 hover:shadow-glow-1"
                >
                  <Icon className="h-6 w-6" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <a
        href="#about"
        aria-label="Scroll down"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-brand-1 sm:flex"
      >
        <span className="flex h-10 w-6 justify-center rounded-full border-2 border-current pt-2">
          <span className="h-2 w-1 animate-scroll-dot rounded-full bg-current" />
        </span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>

      <Dialog open={showResume} onOpenChange={setShowResume}>
        <DialogContent data-lenis-prevent className="glass max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border-0 p-3 sm:p-4">
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
