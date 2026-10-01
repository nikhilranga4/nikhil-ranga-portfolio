import { ArrowUpRight, Check, Copy, Github, Linkedin, Mail, Phone, Send, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import countapi from "countapi-js";
import Marquee from "./ui/marquee";
import { Magnetic } from "./ui/magnetic";
import { ScrollReveal3D } from "./ui/scroll-reveal";
import { NAV_ITEMS } from "@/lib/nav";

const EMAIL = "nikhilranga43@gmail.com";

const SOCIALS = [
  {
    href: "mailto:nikhilranga43@gmail.com",
    label: "Email",
    value: "nikhilranga43@gmail.com",
    icon: Mail,
    tint: "bg-gradient-to-br from-brand-1 to-brand-2",
  },
  {
    href: "https://www.linkedin.com/in/nikhilranga21",
    label: "LinkedIn",
    value: "in/nikhilranga21",
    icon: Linkedin,
    tint: "bg-gradient-to-br from-brand-2 to-brand-3",
  },
  {
    href: "https://github.com/nikhilranga4",
    label: "GitHub",
    value: "@nikhilranga4",
    icon: Github,
    tint: "bg-gradient-to-br from-brand-3 to-brand-4",
  },
  {
    href: "tel:+917989068826",
    label: "Phone",
    value: "+91 79890 68826",
    icon: Phone,
    tint: "bg-gradient-to-br from-brand-4 to-brand-1",
  },
];

const TICKER = ["Available for work", "Open to collaborate", "Let's build together", "React • React Native • AI/ML"];

const Footer = () => {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

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

  return (
    <footer id="contact" className="relative mt-12 overflow-hidden">
      {/* Ticker */}
      <div className="bg-candy -rotate-2 scale-105 py-3 text-on-grad shadow-glow-1">
        <Marquee className="[--duration:25s] [--gap:2rem]" repeat={4}>
          {TICKER.map((t) => (
            <span
              key={t}
              className="flex items-center gap-8 whitespace-nowrap font-display text-xl font-bold uppercase tracking-wide"
            >
              {t}
              <span aria-hidden>✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container py-16 sm:py-24">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ type: "spring", stiffness: 80, damping: 16 }}
            className="text-center lg:text-left"
          >
            <p className="chip mb-5 text-brand-1">
              <span className="text-muted-foreground">06</span> // contact
            </p>
            <h2 className="font-display text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl xl:text-7xl">
              Let&apos;s build something{" "}
              <span className="whitespace-nowrap">
                <span className="text-gradient">awesome</span>{" "}
                <motion.span
                  className="inline-block"
                  animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
                >
                  ✨
                </motion.span>
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg lg:mx-0">
              Got an idea, a project or just want to say hi? My inbox is always open — I usually reply within a day.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Magnetic strength={0.4} className="w-full sm:w-auto">
                <motion.a
                  href={`mailto:${EMAIL}`}
                  whileHover={{ scale: 1.04, rotate: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-candy group flex w-full animate-gradient-x items-center justify-center gap-3 rounded-2xl px-8 py-4 font-display text-lg font-bold text-on-grad shadow-glow-1 sm:w-auto sm:rounded-full"
                >
                  <Send className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:-rotate-12" />
                  Say hello
                </motion.a>
              </Magnetic>
              <button
                type="button"
                onClick={copyEmail}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 px-6 py-4 font-semibold transition-colors hover:border-brand-1 hover:text-brand-1 sm:w-auto sm:rounded-full"
              >
                {copied ? <Check className="h-5 w-5 text-brand-4" /> : <Copy className="h-5 w-5" />}
                {copied ? "Copied!" : "Copy email"}
              </button>
            </div>
          </motion.div>

          {/* Contact card */}
          <ScrollReveal3D direction={1} tilt={25}>
            <div className="gradient-border is-active relative rounded-[2rem] p-2 sm:p-3">
              <div className="glass absolute inset-0 rounded-[2rem]" />
              <ul className="relative divide-y divide-border/60">
                {SOCIALS.map(({ href, label, value, icon: Icon, tint }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors hover:bg-muted/50 sm:px-4 sm:py-4"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-on-grad transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${tint}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                          {label}
                        </span>
                        <span className="block truncate font-semibold">{value}</span>
                      </span>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-1" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal3D>
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/40 backdrop-blur-sm">
        <div className="container grid gap-6 py-8 text-sm text-muted-foreground md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <span className="bg-candy flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-extrabold text-on-grad">
              NR
            </span>
            <span className="font-display text-base font-bold text-foreground">
              nikhil<span className="text-brand-1">.</span>dev
            </span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {NAV_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="transition-colors hover:text-brand-1">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-center gap-2 font-mono text-xs md:justify-end">
            <Users className="h-4 w-4 text-brand-1" />
            {visitorCount !== null ? `${visitorCount.toLocaleString()} visitors` : "Loading..."}
          </div>

          <p className="text-center text-xs md:col-span-3">
            © {new Date().getFullYear()} Nikhil Ranga · Designed &amp; built with React, Three.js &amp; lots of ☕
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
