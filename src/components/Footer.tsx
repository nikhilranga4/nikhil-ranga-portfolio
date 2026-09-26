import { ArrowUp, Github, Linkedin, Mail, Phone, Send, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import countapi from "countapi-js";
import Marquee from "./ui/marquee";

const SOCIALS = [
  { href: "https://github.com/nikhilranga4", label: "GitHub", icon: Github, color: "hover:bg-neon-violet" },
  { href: "https://www.linkedin.com/in/nikhilranga21", label: "LinkedIn", icon: Linkedin, color: "hover:bg-neon-cyan" },
  { href: "mailto:nikhilranga43@gmail.com", label: "Email", icon: Mail, color: "hover:bg-neon-pink" },
  { href: "tel:+917989068826", label: "Phone", icon: Phone, color: "hover:bg-neon-lime" },
];

const TICKER = ["Available for work", "Open to collaborate", "Let's build together", "React • React Native • AI/ML"];

const Footer = () => {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

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
    <footer className="relative mt-12 overflow-hidden">
      {/* Ticker */}
      <div className="bg-candy -rotate-2 scale-105 py-3 text-white shadow-glow-pink">
        <Marquee className="[--duration:25s] [--gap:2rem]" repeat={4}>
          {TICKER.map((t) => (
            <span key={t} className="flex items-center gap-8 whitespace-nowrap font-display text-xl font-bold uppercase tracking-wide">
              {t}
              <span aria-hidden>✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: "spring", stiffness: 80, damping: 16 }}
          className="text-center"
        >
          <p className="chip mb-6 text-neon-pink">
            <span className="text-muted-foreground">06</span> // contact
          </p>
          <h2 className="mx-auto max-w-4xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl md:text-7xl">
            Let&apos;s build something <span className="text-gradient">awesome</span>{" "}
            <motion.span
              className="inline-block"
              animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
            >
              ✨
            </motion.span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
            Got an idea, a project or just want to say hi? My inbox is always open.
          </p>

          <motion.a
            href="mailto:nikhilranga43@gmail.com"
            whileHover={{ scale: 1.06, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-candy mt-10 inline-flex animate-gradient-x items-center gap-3 rounded-full px-8 py-4 font-display text-lg font-bold text-white shadow-glow-pink"
          >
            <Send className="h-5 w-5" />
            Say hello
          </motion.a>

          <div className="mt-12 flex justify-center gap-4">
            {SOCIALS.map(({ href, label, icon: Icon, color }, i) => (
              <motion.a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: i * 0.08 }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-foreground bg-background text-foreground shadow-[0_6px_0_0_hsl(var(--foreground))] transition-all duration-200 hover:-translate-y-1 hover:text-white hover:shadow-[0_10px_0_0_hsl(var(--foreground))] active:translate-y-1 active:shadow-none ${color}`}
              >
                <Icon className="h-6 w-6" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="bg-candy flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-extrabold text-white">
              NR
            </span>
            <span>
              © {new Date().getFullYear()} Nikhil Ranga. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neon-pink" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="font-mono font-semibold"
            >
              {visitorCount !== null ? `${visitorCount.toLocaleString()} visitors` : "Loading..."}
            </motion.span>
          </div>

          <a
            href="#home"
            className="group flex items-center gap-2 font-medium transition-colors hover:text-neon-pink"
          >
            Back to top
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition-transform group-hover:-translate-y-1 group-hover:border-neon-pink">
              <ArrowUp className="h-4 w-4" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
