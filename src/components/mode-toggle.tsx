import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative flex h-10 w-[4.5rem] items-center rounded-full border border-border bg-muted/70 p-1 transition-colors hover:border-neon-pink/60"
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="bg-candy flex h-8 w-8 items-center justify-center rounded-full text-white shadow-glow-pink"
        style={{ marginLeft: isDark ? "auto" : 0 }}
      >
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -120, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </motion.span>
    </button>
  );
}
