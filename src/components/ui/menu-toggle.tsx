import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MenuToggleProps {
  open: boolean;
  onToggle: () => void;
  controls: string;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 26 } as const;

/** Hamburger that morphs into an X, with a playful spin. */
export const MenuToggle = forwardRef<HTMLButtonElement, MenuToggleProps>(
  ({ open, onToggle, controls, className }, ref) => (
    <motion.button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? "Close menu" : "Open menu"}
      whileTap={{ scale: 0.85 }}
      animate={{ rotate: open ? 180 : 0 }}
      transition={spring}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300",
        open ? "border-white/40 bg-white text-brand-2" : "border-border bg-muted/70 text-foreground",
        className
      )}
    >
      <span className="relative block h-3.5 w-5">
        <motion.span
          className="absolute left-0 top-0 block h-[2.5px] w-5 rounded-full bg-current"
          animate={open ? { top: "50%", y: "-50%", rotate: 45 } : { top: "0%", y: "0%", rotate: 0 }}
          transition={spring}
        />
        <motion.span
          className="absolute left-0 top-1/2 block h-[2.5px] w-3.5 -translate-y-1/2 rounded-full bg-current"
          animate={open ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
          transition={spring}
        />
        <motion.span
          className="absolute bottom-0 left-0 block h-[2.5px] w-5 rounded-full bg-current"
          animate={open ? { bottom: "50%", y: "50%", rotate: -45 } : { bottom: "0%", y: "0%", rotate: 0 }}
          transition={spring}
        />
      </span>
    </motion.button>
  )
);
MenuToggle.displayName = "MenuToggle";

export default MenuToggle;
