import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  index: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}

const SectionHeading = ({ index, eyebrow, title, subtitle, className }: SectionHeadingProps) => {
  const words = title.split(" ");

  return (
    <div className={cn("mb-14 text-center sm:mb-20", className)}>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
        className="chip mb-5 text-neon-pink"
      >
        <span className="text-muted-foreground">{index}</span>
        <span>// {eyebrow}</span>
      </motion.p>

      <h2 className="perspective font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 40, rotateX: -80 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "spring", stiffness: 140, damping: 14, delay: i * 0.08 }}
            className={cn(
              "mr-[0.25em] inline-block origin-bottom last:mr-0",
              i === words.length - 1 && "text-gradient"
            )}
          >
            {word}
          </motion.span>
        ))}
      </h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};

export default SectionHeading;
