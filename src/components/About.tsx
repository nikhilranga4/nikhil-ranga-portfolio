import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";

const STATEMENT =
  "I craft playful, high-performance web & mobile experiences — from pixel-perfect React interfaces and cross-platform React Native apps to Node.js backends and AI/ML experiments. I love turning ideas into products people genuinely enjoy using.";

/** Words that glow in the palette gradient once lit */
const HIGHLIGHTS = new Set(["playful,", "React", "React Native", "Node.js", "AI/ML", "enjoy"]);

// Keep multi-word highlights together as one token
const TOKENS = STATEMENT.replace("React Native", "React Native").split(" ");

const CUBE_FACES = [
  { label: "</>", transform: "translateZ(var(--half))" },
  { label: "{ }", transform: "rotateY(180deg) translateZ(var(--half))" },
  { label: "AI", transform: "rotateY(90deg) translateZ(var(--half))" },
  { label: "JS", transform: "rotateY(-90deg) translateZ(var(--half))" },
  { label: "⚛", transform: "rotateX(90deg) translateZ(var(--half))" },
  { label: "🐍", transform: "rotateX(-90deg) translateZ(var(--half))" },
];

const Word = ({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) => {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [10, 0]);
  const clean = word.replace(" ", " ");
  const highlight = HIGHLIGHTS.has(clean);

  return (
    <motion.span style={{ opacity, y }} className={`mr-[0.28em] inline-block ${highlight ? "text-gradient" : ""}`}>
      {word}
    </motion.span>
  );
};

const About = () => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: textRef, offset: ["start 85%", "end 50%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  // The cube tumbles as the whole section scrolls past
  const { scrollYProgress: sectionProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const cubeRotY = useTransform(sectionProgress, [0, 1], [-160, 200]);
  const cubeRotX = useTransform(sectionProgress, [0, 1], [40, -40]);
  const cubeY = useTransform(sectionProgress, [0, 1], [80, -80]);

  return (
    <section ref={sectionRef} id="about" className="relative py-24 sm:py-32">
      <div className="container">
        <SectionHeading index="00" eyebrow="about" title="Hello, World!" bgText="about me" />

        <div className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.4fr]">
          <motion.div style={{ y: cubeY }} className="mx-auto [perspective:900px]">
            <motion.div
              style={{ rotateY: cubeRotY, rotateX: cubeRotX, ["--half" as string]: "clamp(70px, 12vw, 110px)" }}
              className="relative h-[clamp(140px,24vw,220px)] w-[clamp(140px,24vw,220px)] preserve-3d"
            >
              {CUBE_FACES.map((f) => (
                <div
                  key={f.label}
                  style={{ transform: f.transform }}
                  className="absolute inset-0 flex items-center justify-center rounded-3xl border border-white/25 bg-candy font-mono text-5xl font-bold text-white shadow-glow-2 [backface-visibility:hidden] sm:text-6xl"
                >
                  <span className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">{f.label}</span>
                </div>
              ))}
            </motion.div>
            {/* floor glow */}
            <div className="mx-auto mt-16 h-6 w-40 rounded-[50%] bg-brand-2/40 blur-xl" />
          </motion.div>

          <p
            ref={textRef}
            className="text-center font-display text-3xl font-bold leading-[1.25] sm:text-4xl lg:text-left lg:text-[2.75rem]"
          >
            {TOKENS.map((word, i) => {
              const start = i / TOKENS.length;
              const end = start + 1 / TOKENS.length;
              return <Word key={i} word={word} progress={progress} range={[start, end]} />;
            })}
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
