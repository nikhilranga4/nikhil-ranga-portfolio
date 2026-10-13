import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowDownRight, ChevronDown, FileText, Github, Linkedin, Mail, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIntroRevealed } from "@/lib/intro";
import { lenisRef } from "@/lib/lenis";
import { heroProgress, setHeroReady, useIntroStage } from "@/lib/hero-state";
import { useTheme } from "@/components/theme-provider";
import { Magnetic } from "@/components/ui/magnetic";
import Marquee from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

/** Where the room's copy arrives (share of the pinned scroll): matches SCROLL.room in the world */
const ROOM_AT = 0.48;
/** The copy leaves as the camera tilts down to the glass floor (SCROLL.tilt) */
const ROOM_OUT: [number, number] = [0.69, 0.73];

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

/** Letters start "typing" in as the camera settles on the door. */
const NAME_DELAY = 0.05;

/** The name appears once the 3D intro hits its "named" beat (straight away for reduced motion). */
function useNameShown() {
  const stage = useIntroStage();
  const reduceMotion = useReducedMotion();
  return !!reduceMotion || stage === "named" || stage === "done";
}

const LETTER_GAP = 0.06;

const container: Variants = {
  hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 26, transition: { duration: 0.2 } },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 18 } },
};

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

/** Number that counts up from 0 whenever `run` turns on. */
const CountUp = ({ to, suffix = "", run }: { to: number; suffix?: string; run: boolean }) => {
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (!run) return;
    value.set(0);
    const controls = animate(value, to, { duration: 1.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, to, run]);
  return <motion.span>{rounded}</motion.span>;
};

const PulseDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
  </span>
);

// ── The name on the door ───────────────────────────────────────────────────

const LETTER_HIDDEN = { opacity: 0, y: "-0.3em", scale: 0.6 };
const LETTER_SHOWN = { opacity: 1, y: 0, scale: 1 };

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

/** One letter: types in like a key press once the intro reveals the page. */
const Letter = ({ char, order, style }: { char: string; order: number; style?: CSSProperties }) => (
  <motion.span
    initial={LETTER_HIDDEN}
    animate={useNameShown() ? LETTER_SHOWN : LETTER_HIDDEN}
    transition={{ type: "spring", stiffness: 520, damping: 22, delay: NAME_DELAY + order * LETTER_GAP }}
    className="-mb-[0.16em] inline-block pb-[0.16em]"
    style={style}
  >
    {char}
  </motion.span>
);

const Word = ({ text, offset, gradient }: { text: string; offset: number; gradient?: boolean }) => (
  <span aria-hidden>
    {text.split("").map((c, i) => (
      <Letter key={i} char={c} order={offset + i} style={gradient ? sliceStyle(i, text.length) : undefined} />
    ))}
  </span>
);

/** Small mono caption under a word of the name, with a neon rule leading in from the door side. */
const Caption = ({ children, rule, className }: { children: ReactNode; rule?: "left" | "right"; className?: string }) => {
  const revealed = useNameShown();
  const line = (
    <motion.span
      aria-hidden
      initial={{ scaleX: 0 }}
      animate={{ scaleX: revealed ? 1 : 0 }}
      transition={{ delay: NAME_DELAY + 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "inline-block h-px w-10 align-middle shadow-[0_0_8px_hsl(var(--brand-1))]",
        rule === "left" ? "mr-3 origin-right bg-gradient-to-l from-brand-1 to-transparent" : "ml-3 origin-left bg-gradient-to-r from-brand-1 to-transparent"
      )}
    />
  );
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ delay: NAME_DELAY + 0.9, type: "spring", stiffness: 140, damping: 18 }}
      className={cn("mt-4 block font-mono text-[0.68rem] uppercase tracking-[0.28em] text-foreground/60 sm:text-xs", className)}
    >
      {rule === "left" && line}
      {children}
      {rule === "right" && line}
    </motion.span>
  );
};

/** Soft neon bloom around the name, like the sign above the door */
const NAME_GLOW = "[filter:drop-shadow(0_0_22px_rgb(25_227_212/0.35))_drop-shadow(0_2px_2px_rgb(0_0_0/0.6))]";

// ── Small pieces ───────────────────────────────────────────────────────────

/** A stat drawn as a keycap that presses down under the pointer. */
const StatKey = ({ children, label, className }: { children: ReactNode; label: string; className?: string }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      data-pressed={pressed}
      onPointerEnter={() => setPressed(true)}
      onPointerLeave={() => setPressed(false)}
      className={cn("keycap px-4 py-2.5 text-left", className)}
    >
      <div className="relative font-display text-xl font-bold leading-tight">{children}</div>
      <p className="relative mt-0.5 font-mono text-[0.62rem] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
};

/** Two crossing tapes running below the hero. */
const Tapes = () => (
  <div className="relative z-10 h-24 sm:h-28">
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
  const trackRef = useRef<HTMLDivElement>(null);
  const role = useTypewriter(ROLES);
  const portrait = useMediaQuery("(max-aspect-ratio: 1/1)");
  const reduceMotion = !!useReducedMotion();
  const revealed = useIntroRevealed();
  const { palette } = useTheme();
  const stage = useIntroStage();
  const introDone = reduceMotion || stage === "done";

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  // The page-wide 3D world (mounted by the page shell) follows the hero's scroll
  useEffect(() => {
    heroProgress.set(scrollYProgress.get());
    return scrollYProgress.on("change", (p) => heroProgress.set(p));
  }, [scrollYProgress]);
  const [inRoom, setInRoom] = useState(false);
  const [reachedRoom, setReachedRoom] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setInRoom(p >= ROOM_AT - 0.03 && p < ROOM_OUT[1]);
    setReachedRoom(p >= ROOM_AT - 0.03);
  });
  const roomShown = reduceMotion || inRoom;

  // The navbar waits for the room (and stays for the fall); give it back if the hero unmounts
  useEffect(() => setHeroReady(reduceMotion || reachedRoom), [reduceMotion, reachedRoom]);
  useEffect(() => () => setHeroReady(true), []);

  // Door beat: the name drifts apart and fades as the door opens
  const doorFade = useTransform(scrollYProgress, [0, 0.13], [1, 0]);
  const leftX = useTransform(scrollYProgress, [0, 0.13], ["0vw", "-7vw"]);
  const rightX = useTransform(scrollYProgress, [0, 0.13], ["0vw", "7vw"]);
  const cueFade = useTransform(scrollYProgress, [0, 0.04], [1, 0]);
  // Room beat: a dark wash behind the copy; both leave as the camera tilts to the floor
  const washFade = useTransform(scrollYProgress, [ROOM_AT - 0.06, ROOM_AT + 0.04, ROOM_OUT[0], ROOM_OUT[1]], [0, 1, 1, 0]);
  const roomOut = useTransform(scrollYProgress, ROOM_OUT, [1, 0]);

  /** Scrolls to where the room is fully in, playing the door on the way. */
  const enterRoom = (duration = 2.6) => {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const y = top + (ROOM_AT + 0.06) * (track.offsetHeight - window.innerHeight);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section id="home" className="relative z-20">
      {/* Long pin: door → room → the glass floor cracks and shatters → the drop (see SCROLL) */}
      <div ref={trackRef} className={reduceMotion ? "h-[100svh]" : "h-[440svh] lg:h-[520svh]"}>
        {/* Transparent: the page-wide 3D world shows through. Dark tokens in the visitor's palette */}
        <div data-palette={palette} className="dark sticky top-0 h-[100svh] w-full overflow-hidden text-foreground">

          {/* ── Door beat ── */}
          {reduceMotion && <h1 className="sr-only">{`${FIRST} ${LAST}`}</h1>}
          {!reduceMotion && (
            <motion.div style={{ opacity: doorFade }} className="pointer-events-none absolute inset-0">
              {portrait ? (
                <div className="absolute inset-x-0 bottom-[13%] px-5 text-center">
                  <div aria-hidden className="absolute inset-x-0 -bottom-[20vh] -top-16 bg-gradient-to-t from-[#020809] via-[#020809]/60 to-transparent" />
                  <h1 aria-label={`${FIRST} ${LAST}`} className={cn(NAME_TEXT, NAME_GLOW, "relative text-[clamp(3rem,15vw,6rem)]")}>
                    <Word text={FIRST} offset={0} /> <Word text={LAST} offset={FIRST.length} gradient />
                  </h1>
                  <Caption className="relative">Full-stack · AI/ML · Mobile</Caption>
                </div>
              ) : (
                <h1 aria-label={`${FIRST} ${LAST}`} className={cn(NAME_TEXT, "text-[clamp(2.5rem,6.4vw,8rem)]")}>
                  <motion.span style={{ x: leftX, y: "-50%" }} className="absolute right-[60.5%] top-[52%] block text-right">
                    <span className={cn("block", NAME_GLOW)}>
                      <Word text={FIRST} offset={0} />
                    </span>
                    <Caption rule="right">Full-stack · AI/ML · Mobile</Caption>
                  </motion.span>
                  <motion.span style={{ x: rightX, y: "-50%" }} className="absolute left-[60.5%] top-[52%] block text-left">
                    <span className={cn("block", NAME_GLOW)}>
                      <Word text={LAST} offset={FIRST.length} gradient />
                    </span>
                    <Caption rule="left">Hyderabad, India</Caption>
                  </motion.span>
                </h1>
              )}
            </motion.div>
          )}

          {!reduceMotion && (
            <motion.div style={{ opacity: cueFade }} className="absolute inset-x-0 bottom-5 flex justify-center sm:bottom-8">
              <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={introDone ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 140, damping: 16 }}
                tabIndex={introDone ? 0 : -1}
                type="button"
                onClick={() => enterRoom()}
                className="glass group flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.25em] text-foreground/80 transition-colors hover:text-brand-1"
              >
                Scroll to enter
                <ChevronDown className="h-4 w-4 animate-bounce text-brand-1" />
              </motion.button>
            </motion.div>
          )}

          {/* ── Room beat ── */}
          <motion.div
            aria-hidden
            style={reduceMotion ? undefined : { opacity: washFade }}
            className={cn(
              "pointer-events-none absolute",
              portrait
                ? "inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-[#020a0b] from-35% via-[#020a0b]/80 to-transparent"
                : "inset-y-0 left-0 w-[70%] bg-gradient-to-r from-[#020a0b]/95 from-25% via-[#020a0b]/65 to-transparent"
            )}
          />

          <motion.div
            variants={container}
            initial={reduceMotion ? false : "hidden"}
            animate={roomShown && revealed ? "show" : "hidden"}
            onFocus={() => {
              if (!roomShown) enterRoom(1.2);
            }}
            style={reduceMotion ? undefined : { opacity: roomOut }}
            className={cn(
              "absolute",
              roomShown ? "pointer-events-auto" : "pointer-events-none",
              portrait
                ? "inset-x-0 bottom-0 px-5 pb-8"
                : "inset-y-0 left-0 flex w-full items-center px-6 sm:px-10 lg:px-[6vw]"
            )}
          >
            <div className={portrait ? "mx-auto max-w-xl" : "max-w-[34rem] pt-16 xl:max-w-[38rem]"}>
              <motion.div variants={item} className="mb-4 flex flex-wrap items-center gap-2">
                <span className="chip px-3.5 py-1.5 text-xs text-foreground">
                  <span className="inline-block origin-[70%_70%] animate-wiggle [animation-iteration-count:3]">👋</span>
                  Hi, I&apos;m {FIRST} {LAST}
                </span>
                <span className="chip px-3.5 py-1.5 text-xs text-brand-4">
                  <PulseDot />
                  Available for work
                </span>
              </motion.div>

              <motion.h2
                variants={item}
                className="font-display text-[clamp(2rem,8.5vw,2.75rem)] font-bold leading-[1.02] tracking-[var(--display-tracking,-0.02em)] lg:text-[clamp(2.75rem,4.2vw,4.25rem)]"
              >
                I build for the <span className="text-gradient">web, mobile &amp; AI.</span>
              </motion.h2>

              <motion.div
                variants={item}
                className="glass mt-5 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 font-mono text-sm sm:text-base"
              >
                <span className="text-brand-2">$</span>
                <span className="text-muted-foreground">whoami</span>
                <span className="text-brand-1">→</span>
                <span className="min-w-[20ch] text-left text-foreground">
                  {role}
                  <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.2em] animate-blink bg-brand-1" />
                </span>
              </motion.div>

              <motion.p variants={item} className="mt-5 hidden max-w-xl text-base leading-relaxed text-muted-foreground sm:block lg:text-lg">
                Passionate full-stack developer with expertise in React and React Native, dedicated to creating
                innovative web and mobile solutions. Committed to continuous learning and delivering high-quality,
                user-centric applications.
              </motion.p>

              <motion.div variants={item} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid grid-cols-2 gap-3 sm:flex">
                  <Magnetic className="w-full sm:w-auto" strength={0.25}>
                    <motion.button
                      type="button"
                      onClick={() => setShowResume(true)}
                      whileTap={{ scale: 0.95 }}
                      className="bg-candy group relative flex w-full animate-gradient-x items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3.5 font-display text-base font-bold shadow-glow-1 sm:px-7"
                    >
                      <FileText className="h-5 w-5 transition-transform group-hover:-rotate-12" />
                      Resume
                      <Sparkles className="hidden h-4 w-4 transition-transform group-hover:rotate-45 group-hover:scale-125 sm:block" />
                    </motion.button>
                  </Magnetic>
                  <Magnetic className="w-full sm:w-auto" strength={0.25}>
                    <a
                      href="#contact"
                      className="group flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-background/60 px-5 py-3.5 font-display text-base font-bold backdrop-blur transition-colors hover:border-brand-1 hover:text-brand-1 sm:px-7"
                    >
                      Let&apos;s talk
                      <ArrowDownRight className="h-5 w-5 transition-transform group-hover:rotate-[-45deg]" />
                    </a>
                  </Magnetic>
                </div>
                <div className="flex justify-center gap-3 sm:justify-start">
                  {SOCIALS.map(({ href, label, icon: Icon }) => (
                    <motion.a
                      key={label}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      aria-label={label}
                      whileHover={{ y: -4, rotate: -6 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 text-foreground backdrop-blur transition-colors hover:border-brand-1 hover:text-brand-1 hover:shadow-glow-1"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {!portrait && (
                <motion.div variants={item} className="mt-8 hidden flex-wrap gap-3 md:flex">
                  <StatKey label="projects shipped">
                    <span className="text-gradient">
                      <CountUp to={11} run={roomShown} />
                    </span>
                  </StatKey>
                  <StatKey label="technologies">
                    <span className="text-gradient">
                      <CountUp to={20} suffix="+" run={roomShown} />
                    </span>
                  </StatKey>
                  <StatKey label="full stack intern">
                    <span className="flex items-center gap-2">
                      <PulseDot />@ SimplifyTech In
                    </span>
                  </StatKey>
                </motion.div>
              )}
            </div>
          </motion.div>

        </div>
      </div>

      <div className="py-6 sm:py-8">
        <Tapes />
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
