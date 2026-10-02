import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowDownRight, FileText, Github, Linkedin, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { Magnetic } from "@/components/ui/magnetic";
import Marquee from "@/components/ui/marquee";
import { cn } from "@/lib/utils";
import { useIntro } from "@/lib/intro";

// Loaded once the intro is over (the intro prefetches it while idle)
const HeroScene = lazy(() => import("@/components/three/HeroScene"));

const ROLES = ["Full Stack Developer", "AI/ML Engineer", "React Native Dev", "Creative Coder"];
const FIRST = "Nikhil";
const LAST = "Ranga";

const SOCIALS = [
  { href: "https://github.com/nikhilranga4", label: "GitHub", icon: Github },
  { href: "https://www.linkedin.com/in/nikhilranga21", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:nikhilranga43@gmail.com", label: "Email", icon: Mail },
];

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";
const STACK = [
  { name: "React", icon: `${DEVICON}/react/react-original.svg` },
  { name: "TypeScript", icon: `${DEVICON}/typescript/typescript-original.svg` },
  { name: "React Native", icon: `${DEVICON}/react/react-original.svg` },
  { name: "Node.js", icon: `${DEVICON}/nodejs/nodejs-original.svg` },
  { name: "Python", icon: `${DEVICON}/python/python-original.svg` },
  { name: "MongoDB", icon: `${DEVICON}/mongodb/mongodb-original.svg` },
  { name: "Tailwind", icon: `${DEVICON}/tailwindcss/tailwindcss-original.svg` },
  { name: "Django", icon: `${DEVICON}/django/django-plain.svg` },
  { name: "Git", icon: `${DEVICON}/git/git-original.svg` },
  { name: "Figma", icon: `${DEVICON}/figma/figma-original.svg` },
];

const TAPE = ["Available for work", "Open to collaborations", "Based in Hyderabad", "Web · Mobile · AI"];

/** Letters start "typing" in as the intro's screen dissolves into the hero. */
const NAME_DELAY = 0.2;
const LETTER_GAP = 0.06;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: NAME_DELAY + 0.5 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Number that counts up from 0 once `play` is true. */
const CountUp = ({ to, suffix = "", delay = 0, play = true }: { to: number; suffix?: string; delay?: number; play?: boolean }) => {
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (!play) return;
    const controls = animate(value, to, { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, to, delay, play]);
  return <motion.span>{rounded}</motion.span>;
};

const PulseDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
  </span>
);

// ── The name ───────────────────────────────────────────────────────────────

const NAME_TEXT = "font-display font-bold leading-[0.92] tracking-[var(--display-tracking,-0.03em)] whitespace-nowrap";

/**
 * Gradient for one letter of the last name: each letter paints its own slice of the theme's
 * text gradient, so letters can move independently without breaking `background-clip: text`.
 */
const sliceStyle = (k: number, n: number): CSSProperties => ({
  backgroundImage: "var(--grad-text)",
  backgroundSize: `${n * 100}% 100%`,
  backgroundPosition: `${(k / (n - 1)) * 100}% 0`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});

/** One letter: types in like a key press and dips down (pressed) on hover or tap. */
const Letter = ({ char, order, style }: { char: string; order: number; style?: CSSProperties }) => (
  <motion.span
    initial={{ opacity: 0, y: "-0.3em", scale: 0.6 }}
    animate={useIntro().done ? { opacity: 1, y: 0, scale: 1 } : undefined}
    transition={{ type: "spring", stiffness: 520, damping: 22, delay: NAME_DELAY + order * LETTER_GAP }}
    whileHover={{ y: "0.06em", scale: 0.93 }}
    whileTap={{ y: "0.08em", scale: 0.9 }}
    className="-mb-[0.16em] inline-block cursor-default pb-[0.16em]"
    style={style}
  >
    {char}
  </motion.span>
);

const Caret = () => (
  <motion.span
    aria-hidden
    initial={{ opacity: 0 }}
    animate={useIntro().done ? { opacity: 1 } : undefined}
    transition={{ delay: NAME_DELAY + (FIRST.length + LAST.length) * LETTER_GAP }}
    className="ml-[0.05em] inline-block h-[0.72em] w-[0.06em] translate-y-[0.04em] rounded-[0.02em] bg-brand-1"
  >
    <span className="block h-full w-full animate-blink bg-brand-1" />
  </motion.span>
);

/** Invisible copy of the name at 100px, used to fit the real one to the available width. */
const NameProbe = ({ text, probeRef }: { text: string; probeRef: RefObject<HTMLSpanElement> }) => (
  <span ref={probeRef} aria-hidden className={cn(NAME_TEXT, "invisible absolute left-0 top-0")} style={{ fontSize: 100 }}>
    {text.split("").map((c, i) => (
      <span key={i} className="inline-block">
        {c === " " ? " " : c}
      </span>
    ))}
    <span className="ml-[0.05em] inline-block w-[0.06em]" />
  </span>
);

/**
 * Sizes the name so it fills the column: one line from `sm` up (also capped by viewport height),
 * two stacked lines on phones where the longer word spans the width. Re-fits on resize, when
 * fonts load and when the theme (and so the display font) changes.
 */
function useNameFit() {
  const boxRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLSpanElement>(null);
  const firstRef = useRef<HTMLSpanElement>(null);
  const lastRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);
  const [stacked, setStacked] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const fit = () => {
      const box = boxRef.current;
      if (!box || !fullRef.current || !firstRef.current || !lastRef.current) return;
      const avail = box.clientWidth;
      const narrow = window.innerWidth < 640;
      setStacked(narrow);
      if (narrow) {
        const widest = Math.max(firstRef.current.offsetWidth, lastRef.current.offsetWidth);
        if (widest) setSize(Math.min((avail * 0.98 * 100) / widest, 180));
      } else {
        const width = fullRef.current.offsetWidth;
        if (width) setSize(Math.min((Math.min(avail * 0.84, 1120) * 100) / width, window.innerHeight * 0.2));
      }
    };
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.addEventListener("loadingdone", fit);
    document.fonts?.ready.then(fit).catch(() => undefined);
    const observer = new MutationObserver(() => requestAnimationFrame(fit));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
    return () => {
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
      observer.disconnect();
    };
  }, []);

  return { boxRef, fullRef, firstRef, lastRef, size, stacked };
}

const Name = () => {
  const { boxRef, fullRef, firstRef, lastRef, size, stacked } = useNameFit();
  return (
    <div ref={boxRef} className="relative w-full">
      <NameProbe text={`${FIRST} ${LAST}`} probeRef={fullRef} />
      <NameProbe text={FIRST} probeRef={firstRef} />
      <NameProbe text={LAST} probeRef={lastRef} />
      <h1
        aria-label={`${FIRST} ${LAST}`}
        className={cn(NAME_TEXT, "relative text-center")}
        style={{ fontSize: size ?? "clamp(3.5rem, 13vw, 11rem)" }}
      >
        <span aria-hidden className={cn("text-foreground", stacked ? "block" : "inline")}>
          {FIRST.split("").map((c, i) => (
            <Letter key={i} char={c} order={i} />
          ))}
        </span>
        {!stacked && <span aria-hidden>{" "}</span>}
        <span aria-hidden className={stacked ? "block" : "inline"}>
          {LAST.split("").map((c, i) => (
            <Letter key={i} char={c} order={FIRST.length + i} style={sliceStyle(i, LAST.length)} />
          ))}
          <Caret />
        </span>
      </h1>
    </div>
  );
};

// ── Small pieces ───────────────────────────────────────────────────────────

/** A stat drawn as a keycap that presses down under the pointer. */
const StatKey = ({ children, label, className }: { children: ReactNode; label: string; className?: string }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      data-pressed={pressed}
      onPointerEnter={() => setPressed(true)}
      onPointerLeave={() => setPressed(false)}
      className={cn("keycap px-4 py-2.5 text-left sm:px-5 sm:py-3", className)}
    >
      <div className="relative font-display text-xl font-bold leading-tight sm:text-2xl">{children}</div>
      <p className="relative mt-0.5 font-mono text-[0.62rem] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
};

/** Two crossing tapes running along the bottom of the hero. */
const Tapes = () => (
  <div className="relative z-10 mt-10 h-24 sm:mt-12 sm:h-28">
    <div className="glass absolute left-1/2 top-1/2 w-[120vw] -translate-x-1/2 -translate-y-1/2 rotate-[2.2deg] py-2">
      <Marquee reverse className="p-0 [--duration:36s] [--gap:2rem]" repeat={4}>
        {TAPE.map((t) => (
          <span key={t} className="flex items-center gap-8 whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
            {t}
            <span className="text-brand-2">✦</span>
          </span>
        ))}
      </Marquee>
    </div>
    <div className="bg-candy absolute left-1/2 top-1/2 w-[120vw] -translate-x-1/2 -translate-y-1/2 -rotate-[2.2deg] py-2.5 shadow-[0_20px_50px_-20px_hsl(var(--brand-1)/0.7)] sm:py-3">
      <Marquee pauseOnHover className="p-0 [--duration:30s] [--gap:2rem]" repeat={4}>
        {STACK.map((tech) => (
          <span key={tech.name} className="flex items-center gap-2.5 whitespace-nowrap font-display text-lg font-bold uppercase sm:text-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white p-1 shadow-sm">
              <img src={tech.icon} alt="" className="h-full w-full object-contain" loading="lazy" />
            </span>
            {tech.name}
            <span className="ml-5 opacity-60">✦</span>
          </span>
        ))}
      </Marquee>
    </div>
  </div>
);

// ── Hero ───────────────────────────────────────────────────────────────────

const Hero = () => {
  const [showResume, setShowResume] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const role = useTypewriter(ROLES);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { done: play, settled } = useIntro();

  // The copy drifts up and fades as the hero scrolls away (the 3D keys scatter on their own)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="home"
      // Sits under the intro's last screen so flying into the monitor lands right on the hero
      className="relative -mt-[100svh] flex min-h-[100svh] flex-col overflow-hidden pt-20 sm:pt-24"
    >
      {/* Soft spotlight behind the name */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[46%] h-[34rem] w-[min(64rem,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-1/[0.12] blur-3xl"
      />

      {/* 3D keycaps: a band above the copy on phones/tablets, all around it on desktop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[21rem] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent)] [mask-image:linear-gradient(to_bottom,black_70%,transparent)] sm:h-[25rem] lg:inset-0 lg:h-auto lg:[-webkit-mask-image:none] lg:[mask-image:none]"
      >
        <SceneBoundary>
          <Suspense fallback={null}>
            {settled && <HeroScene key={desktop ? "wide" : "compact"} active={inView} compact={!desktop} colors={colors} />}
          </Suspense>
        </SceneBoundary>
      </div>

      <motion.div
        style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
        className="container relative z-10 flex flex-1 flex-col items-center justify-start pt-[12.5rem] text-center sm:pt-[16.5rem] lg:justify-center lg:pt-6"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={play ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: NAME_DELAY - 0.2, type: "spring", stiffness: 160, damping: 18 }}
          className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-6"
        >
          <span className="chip px-3.5 py-1.5 text-xs text-foreground sm:text-sm">
            <span className="inline-block origin-[70%_70%] animate-wiggle [animation-delay:1.6s] [animation-iteration-count:3]">
              👋
            </span>
            Hey there, I&apos;m
          </span>
          <span className="chip px-3.5 py-1.5 text-xs text-brand-4 sm:text-sm">
            <PulseDot />
            Available for work
          </span>
        </motion.div>

        <Name />

        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate={play ? "show" : "hidden"}
          className="flex w-full flex-col items-center"
        >
          <motion.div
            variants={item}
            className="glass mt-6 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 font-mono text-sm sm:mt-8 sm:px-5 sm:text-base"
          >
            <span className="text-brand-2">$</span>
            <span className="text-muted-foreground">whoami</span>
            <span className="text-brand-1">→</span>
            <span className="min-w-[20ch] text-left text-foreground">
              {role}
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.2em] animate-blink bg-brand-1" />
            </span>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
          >
            Passionate full-stack developer with expertise in React and React Native, dedicated to creating innovative
            web and mobile solutions. Committed to continuous learning and delivering high-quality, user-centric
            applications.
          </motion.p>

          <motion.div variants={item} className="mt-7 flex w-full flex-col items-center gap-3 sm:mt-8 sm:w-auto sm:flex-row">
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
              <Magnetic className="w-full sm:w-auto" strength={0.25}>
                <motion.button
                  type="button"
                  onClick={() => setShowResume(true)}
                  whileTap={{ scale: 0.95 }}
                  className="bg-candy group relative flex w-full animate-gradient-x items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3.5 font-display text-base font-bold shadow-glow-1 sm:px-7 sm:py-4"
                >
                  <FileText className="h-5 w-5 transition-transform group-hover:-rotate-12" />
                  Resume
                  <Sparkles className="hidden h-4 w-4 transition-transform group-hover:rotate-45 group-hover:scale-125 sm:block" />
                </motion.button>
              </Magnetic>
              <Magnetic className="w-full sm:w-auto" strength={0.25}>
                <a
                  href="#contact"
                  className="group flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-background/60 px-5 py-3.5 font-display text-base font-bold backdrop-blur transition-colors hover:border-brand-1 hover:text-brand-1 sm:px-7 sm:py-4"
                >
                  Let&apos;s talk
                  <ArrowDownRight className="h-5 w-5 transition-transform group-hover:rotate-[-45deg]" />
                </a>
              </Magnetic>
            </div>
            <div className="flex gap-3">
              {SOCIALS.map(({ href, label, icon: Icon }) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ y: -4, rotate: -6 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 text-foreground backdrop-blur transition-colors hover:border-brand-1 hover:text-brand-1 hover:shadow-glow-1 sm:h-14 sm:w-14"
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
            <StatKey label="projects shipped">
              <span className="text-gradient">
                <CountUp to={11} delay={NAME_DELAY + 1.2} play={play} />
              </span>
            </StatKey>
            <StatKey label="technologies">
              <span className="text-gradient">
                <CountUp to={20} suffix="+" delay={NAME_DELAY + 1.35} play={play} />
              </span>
            </StatKey>
            <StatKey label="full stack intern" className="basis-full text-center sm:basis-auto sm:text-left">
              <span className="flex items-center justify-center gap-2 sm:justify-start">
                <PulseDot />
                @ SimplifyTech In
              </span>
            </StatKey>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 40 }}
        animate={play ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: NAME_DELAY + 1.1, type: "spring", stiffness: 80, damping: 18 }}
      >
        <Tapes />
      </motion.div>

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
