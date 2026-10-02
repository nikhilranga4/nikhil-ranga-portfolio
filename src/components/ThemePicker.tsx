import { motion } from "framer-motion";
import { Bot, Check, Moon, Palette, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { PALETTES } from "@/lib/palettes";
import { PaletteOrb } from "@/components/ui/palette-orb";
import { cn } from "@/lib/utils";

const ThemePicker = () => {
  const { palette, setPalette, resolvedMode, setTheme, buddy, setBuddy } = useTheme();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Change colour theme"
        className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/70 transition-colors hover:border-brand-1/60"
      >
        <span className="absolute inset-1 animate-spin-slow rounded-full bg-[conic-gradient(hsl(var(--brand-1)),hsl(var(--brand-2)),hsl(var(--brand-3)),hsl(var(--brand-4)),hsl(var(--brand-1)))] opacity-90" />
        <span className="absolute inset-[7px] rounded-full bg-background/80" />
        <Palette className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={14}
        data-lenis-prevent
        className="glass w-[19rem] rounded-3xl border-0 p-5 text-foreground shadow-[0_30px_80px_-20px_hsl(var(--brand-2)/0.5)]"
      >
        <p className="mb-1 font-display text-lg font-bold">
          Pick a <span className="text-gradient">vibe</span>
        </p>
        <p className="mb-4 font-mono text-[0.7rem] text-muted-foreground">// colours, gradients &amp; fonts all change</p>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {PALETTES.map((p, i) => {
            const active = palette === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                title={p.name}
                aria-label={`${p.name} theme`}
                aria-pressed={active}
                onClick={(e) => setPalette(p.id, { x: e.clientX, y: e.clientY })}
                initial={{ opacity: 0, y: 12, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16, delay: i * 0.05 }}
                whileHover={{ y: -5, rotate: -8, scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "relative rounded-full p-[3px] transition-all",
                    active ? "bg-foreground/80" : "bg-transparent"
                  )}
                >
                  <PaletteOrb id={p.id} />
                  {active && (
                    <motion.span
                      layoutId="palette-check"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </motion.span>
                  )}
                </span>
                {/* The theme's name, set in its own display font */}
                <span data-palette={p.id} className="font-display text-[0.8rem] font-bold leading-tight text-foreground">
                  {p.name.split(" ")[0]}
                </span>
              </motion.button>
            );
          })}
        </div>
        <p className="-mt-2 mb-5 text-center text-sm">
          <span className="font-display font-semibold">{PALETTES.find((p) => p.id === palette)?.name}</span>
          <span className="block font-mono text-[0.65rem] text-muted-foreground">
            {PALETTES.find((p) => p.id === palette)?.fonts}
          </span>
        </p>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={(e) => setTheme(mode, { x: e.clientX, y: e.clientY })}
              className={cn(
                "relative isolate flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold capitalize transition-colors",
                resolvedMode === mode ? "text-on-grad" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {resolvedMode === mode && (
                <motion.span
                  layoutId="mode-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="bg-candy absolute inset-0 -z-10 rounded-full"
                />
              )}
              {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {mode}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-brand-1" />
            Robot buddy
          </span>
          <Switch checked={buddy} onCheckedChange={setBuddy} aria-label="Show robot buddy" />
        </label>
      </PopoverContent>
    </Popover>
  );
};

export default ThemePicker;
