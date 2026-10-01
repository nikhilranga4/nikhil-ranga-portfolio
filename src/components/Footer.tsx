import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, Copy, Github, Linkedin, Mail, MapPin, Phone, Send, Users } from "lucide-react";
import countapi from "countapi-js";
import { Magnetic } from "./ui/magnetic";
import { ScrollReveal3D } from "./ui/scroll-reveal";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const EMAIL = "nikhilranga43@gmail.com";

const SOCIALS = [
  { href: `mailto:${EMAIL}`, label: "Email", value: EMAIL, icon: Mail },
  { href: "https://www.linkedin.com/in/nikhilranga21", label: "LinkedIn", value: "in/nikhilranga21", icon: Linkedin },
  { href: "https://github.com/nikhilranga4", label: "GitHub", value: "@nikhilranga4", icon: Github },
  { href: "tel:+917989068826", label: "Phone", value: "+91 79890 68826", icon: Phone },
];

const IDEAS = ["a website", "a mobile app", "an AI tool", "something else"];
const ROTATING = ["awesome", "a web app", "a mobile app", "an AI tool"];

/** Cycles through words with a typewriter effect. */
function useRotatingWord(words: string[]) {
  const [i, setI] = useState(0);
  const [text, setText] = useState(words[0]);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[i % words.length];
    const done = !deleting && text === word;
    const empty = deleting && text === "";
    const t = setTimeout(
      () => {
        if (done) setDeleting(true);
        else if (empty) {
          setDeleting(false);
          setI((n) => n + 1);
        } else setText(word.slice(0, text.length + (deleting ? -1 : 1)));
      },
      done ? 2200 : deleting ? 45 : 90,
    );
    return () => clearTimeout(t);
  }, [text, deleting, i, words]);
  return text;
}

/** Live local time in Hyderabad (IST). */
function useIstTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const hour = Number(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })) % 24;
  const part =
    hour < 5
      ? "late night 🌙"
      : hour < 12
        ? "morning ☀️"
        : hour < 17
          ? "afternoon 🌤️"
          : hour < 21
            ? "evening 🌆"
            : "night 🌙";
  return { time, part };
}

/**
 * One line of the wordmark drawn as SVG text. The viewBox is set to the text's own bounding box,
 * so it scales to exactly the available width in any font, and the gradient fill is a real SVG
 * gradient (reliable on every browser, unlike background-clip text on some mobile Safari builds).
 */
const WordmarkLine = ({ text, id }: { text: string; id: string }) => {
  const textRef = useRef<SVGTextElement>(null);
  const [box, setBox] = useState("0 0 1000 160");

  useEffect(() => {
    const fit = () => {
      const el = textRef.current;
      if (!el) return;
      try {
        const b = el.getBBox();
        if (b.width) setBox(`${b.x} ${b.y} ${b.width} ${b.height}`);
      } catch {
        // getBBox can throw while the SVG isn't rendered yet; the default viewBox still shows the text
      }
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => undefined);
    document.fonts?.addEventListener("loadingdone", fit);
    const mo = new MutationObserver(() => requestAnimationFrame(fit));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
    return () => {
      document.fonts?.removeEventListener("loadingdone", fit);
      mo.disconnect();
    };
  }, [text]);

  return (
    <svg viewBox={box} className="block h-auto w-full overflow-visible" role="presentation">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "hsl(var(--brand-1))" }} />
          <stop offset="50%" style={{ stopColor: "hsl(var(--brand-3))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--brand-2))" }} />
        </linearGradient>
      </defs>
      <text
        ref={textRef}
        x="0"
        y="120"
        fill={`url(#${id})`}
        stroke="hsl(var(--foreground) / 0.12)"
        strokeWidth="1"
        className="font-display font-extrabold uppercase"
        style={{ fontSize: 140, fontVariationSettings: "var(--display-variation, normal)" }}
      >
        {text}
      </text>
    </svg>
  );
};

/** Giant footer wordmark: one line on wider screens, two stacked lines on phones. */
const Wordmark = ({ text }: { text: string }) => {
  const [first, ...rest] = text.split(" ");
  return (
    <motion.div
      aria-label={text}
      role="img"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 70, damping: 16 }}
      className="select-none"
    >
      <div className="hidden sm:block">
        <WordmarkLine text={text} id="wordmark-full" />
      </div>
      <div className="flex flex-col gap-2 sm:hidden">
        <WordmarkLine text={first} id="wordmark-first" />
        <WordmarkLine text={rest.join(" ")} id="wordmark-rest" />
      </div>
    </motion.div>
  );
};

const Footer = () => {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [copied, setCopied] = useState<"email" | "message" | null>(null);
  const [ideas, setIdeas] = useState<string[]>(["a website"]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const word = useRotatingWord(ROTATING);
  const { time, part } = useIstTime();

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        // Replace with your unique namespace and key for tracking
        const namespace = "nikhil-ranga.netlify.app";
        const key = "visits";

        // Increment the count and fetch the updated value
        const result = await countapi.hit(namespace, key);
        setVisitorCount(result.value);
      } catch (error) {
        console.error("Error fetching visitor count:", error);
        setVisitorCount(1); // Fallback value if the API fails
      }
    };

    fetchVisitorCount();
  }, []);

  const flash = (what: "email" | "message") => {
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  const subject = `Let's build ${ideas.length ? ideas.join(" + ") : "something"}${name ? ` — from ${name}` : ""}`;
  const body = `Hi Nikhil,\n\n${message || "I'd love to talk about a project."}\n\n${name ? `— ${name}` : ""}`;

  const copy = async (text: string, what: "email" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      flash(what);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const toggleIdea = (idea: string) =>
    setIdeas((list) => (list.includes(idea) ? list.filter((i) => i !== idea) : [...list, idea]));

  return (
    <footer id="contact" className="relative mt-8 overflow-hidden">
      <div className="container py-16 sm:py-24">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "spring", stiffness: 80, damping: 16 }}
          className="mb-10 text-center sm:mb-14"
        >
          <p className="chip mb-5 text-brand-1">
            <span className="text-muted-foreground">06</span> // contact
          </p>
          <h2 className="font-display text-[2.5rem] font-extrabold leading-[1.05] sm:text-6xl xl:text-7xl">
            Let&apos;s build
            <br />
            <span className="text-gradient inline-block min-h-[1.15em] pb-[0.1em]">{word}</span>
            <span className="ml-1 inline-block h-[0.85em] w-[0.08em] translate-y-[0.1em] animate-pulse rounded-full bg-brand-1" />
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Got an idea, a project or just want to say hi? Pick what you have in mind and send it my way.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-8">
          {/* Left: status + links */}
          <div className="flex flex-col gap-4">
            <ScrollReveal3D direction={-1} tilt={20}>
              <div className="gradient-border is-active relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
                <div className="glass absolute inset-0" />
                <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-1/25 blur-3xl" />
                <div className="relative">
                  <span className="chip text-brand-4">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-4" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-4" />
                    </span>
                    Available for work
                  </span>
                  <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    My local time
                  </p>
                  <p className="mt-1 font-display text-4xl font-bold tabular-nums sm:text-5xl">{time}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-brand-2" /> Hyderabad, India · it&apos;s {part} here
                  </p>
                </div>
              </div>
            </ScrollReveal3D>

            <ScrollReveal3D direction={-1} tilt={20}>
              <ul className="glass grid grid-cols-2 gap-2 rounded-[1.75rem] p-2">
                {SOCIALS.map(({ href, label, value, icon: Icon }) => (
                  <li key={label} className="min-w-0">
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="group flex h-full flex-col gap-3 rounded-2xl p-3.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex items-center justify-between">
                        <span className="bg-candy flex h-10 w-10 items-center justify-center rounded-xl text-on-grad shadow-glow-1 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                          <Icon className="h-[1.1rem] w-[1.1rem]" />
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-1" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[0.62rem] uppercase tracking-widest text-muted-foreground">
                          {label}
                        </span>
                        <span className="block truncate text-sm font-semibold">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollReveal3D>
          </div>

          {/* Right: message composer */}
          <ScrollReveal3D direction={1} tilt={20}>
            <form
              onSubmit={send}
              className="gradient-border is-active relative h-full overflow-hidden rounded-[1.75rem]"
            >
              <div className="glass absolute inset-0" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="ml-2 truncate font-mono text-xs text-muted-foreground">new-message.txt</span>
                </div>

                <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                  <fieldset>
                    <legend className="mb-2.5 font-display text-lg font-semibold">I want to build…</legend>
                    <div className="flex flex-wrap gap-2">
                      {IDEAS.map((idea) => {
                        const on = ideas.includes(idea);
                        return (
                          <motion.button
                            key={idea}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            aria-pressed={on}
                            onClick={() => toggleIdea(idea)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                              on
                                ? "bg-candy text-on-grad shadow-glow-1"
                                : "border border-border bg-background/50 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <AnimatePresence initial={false}>
                              {on && (
                                <motion.span
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: "auto", opacity: 1 }}
                                  exit={{ width: 0, opacity: 0 }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                            {idea}
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label htmlFor="contact-name" className="flex flex-col gap-1.5">
                    <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted-foreground">
                      Your name
                    </span>
                    <input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane from Acme"
                      className="rounded-xl border border-border bg-background/60 px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-1"
                    />
                  </label>

                  <label htmlFor="contact-message" className="flex flex-1 flex-col gap-1.5">
                    <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted-foreground">
                      Message
                    </span>
                    <textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Tell me a little about your idea, timeline or role…"
                      className="min-h-[7rem] flex-1 resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-1"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Magnetic strength={0.25} className="w-full sm:w-auto">
                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.95 }}
                        className="bg-candy group flex w-full animate-gradient-x items-center justify-center gap-2.5 rounded-2xl px-7 py-3.5 font-display text-base font-bold text-on-grad shadow-glow-1 sm:w-auto"
                      >
                        <Send className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:-rotate-12" />
                        Send via email
                      </motion.button>
                    </Magnetic>
                    <button
                      type="button"
                      onClick={() => copy(EMAIL, "email")}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 px-5 py-3.5 text-sm font-semibold transition-colors hover:border-brand-1 hover:text-brand-1"
                    >
                      {copied === "email" ? <Check className="h-4 w-4 text-brand-4" /> : <Copy className="h-4 w-4" />}
                      {copied === "email" ? "Email copied!" : "Copy email"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Opens your email app with the message ready to send to {EMAIL}.
                  </p>
                </div>
              </div>
            </form>
          </ScrollReveal3D>
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t border-border/60">
        <div className="container pt-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="max-w-xs">
              <div className="flex items-center gap-3">
                <span className="bg-candy flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-extrabold text-on-grad">
                  NR
                </span>
                <span className="font-display text-xl font-bold">
                  nikhil<span className="text-brand-1">.</span>dev
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Full Stack Developer &amp; AI/ML Engineer building playful web and mobile experiences.
              </p>
            </div>

            <nav aria-label="Footer">
              <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-widest text-muted-foreground">Navigate</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {NAV_ITEMS.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="transition-colors hover:text-brand-1">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-widest text-muted-foreground">Connect</p>
              <ul className="flex flex-col gap-2 text-sm">
                {SOCIALS.slice(1, 3).map(({ href, label }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 transition-colors hover:text-brand-1"
                    >
                      {label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-brand-1" />
                  {visitorCount !== null ? `${visitorCount.toLocaleString()} visitors` : "Loading..."}
                </li>
              </ul>
            </div>

            <a
              href="#home"
              className="group hidden h-fit items-center gap-2 self-start rounded-full sm:flex sm:w-fit border border-border bg-background/50 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-brand-1 hover:text-brand-1"
            >
              Back to top
              <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="mt-12">
            <Wordmark text="Nikhil Ranga" />
          </div>

          <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 py-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Nikhil Ranga. All rights reserved.</p>
            <p className="font-mono">Built with React · Three.js · Framer Motion</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
