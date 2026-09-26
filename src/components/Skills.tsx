import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hand } from "lucide-react";
import Marquee from "./ui/marquee";
import SectionHeading from "@/components/SectionHeading";

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const skills = [
  { name: "React", icon: `${DEVICON}/react/react-original.svg`, category: "Frontend" },
  { name: "TypeScript", icon: `${DEVICON}/typescript/typescript-original.svg`, category: "Languages" },
  { name: "JavaScript", icon: `${DEVICON}/javascript/javascript-original.svg`, category: "Languages" },
  { name: "Python", icon: `${DEVICON}/python/python-original.svg`, category: "Languages" },
  { name: "HTML", icon: `${DEVICON}/html5/html5-original.svg`, category: "Frontend" },
  { name: "CSS", icon: `${DEVICON}/css3/css3-original.svg`, category: "Frontend" },
  { name: "MongoDB", icon: `${DEVICON}/mongodb/mongodb-original.svg`, category: "Database" },
  { name: "React Native", icon: `${DEVICON}/react/react-original.svg`, category: "Mobile" },
  { name: "Git", icon: `${DEVICON}/git/git-original.svg`, category: "Tools" },
  { name: "GitHub", icon: `${DEVICON}/github/github-original-wordmark.svg`, category: "Tool" },
  { name: "Figma", icon: `${DEVICON}/figma/figma-original.svg`, category: "Design" },
  { name: "Linux", icon: `${DEVICON}/linux/linux-original.svg`, category: "Tools" },
  { name: "Android Studio", icon: `${DEVICON}/androidstudio/androidstudio-original.svg`, category: "Tool" },
  { name: "Django", icon: `${DEVICON}/django/django-plain.svg`, category: "Python framework" },
  { name: "Netlify", icon: `${DEVICON}/netlify/netlify-original.svg`, category: "Deployment platform" },
  { name: "NodeJS", icon: `${DEVICON}/nodejs/nodejs-plain-wordmark.svg`, category: "Backend language" },
  { name: "TailwindCSS", icon: `${DEVICON}/tailwindcss/tailwindcss-original.svg`, category: "CSS Framework" },
  { name: "Ubuntu", icon: `${DEVICON}/ubuntu/ubuntu-original.svg`, category: "Operating System" },
  { name: "Vercel", icon: `${DEVICON}/vercel/vercel-original.svg`, category: "Hosting platform" },
  { name: "Mysql", icon: `${DEVICON}/mysql/mysql-original-wordmark.svg`, category: "Database" },
];

type Skill = (typeof skills)[number];

const STATS = [
  { value: "20+", label: "Technologies" },
  { value: "11", label: "Projects shipped" },
  { value: "3", label: "Roles & clubs" },
];

/** Points evenly distributed on a unit sphere (Fibonacci lattice). */
const SPHERE_POINTS = skills.map((_, i) => {
  const n = skills.length;
  const y = 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
});

/**
 * A draggable, auto-rotating cloud of skill icons. Positions are projected in JS each frame
 * so every icon always faces the viewer and fades/scales with depth.
 */
const SkillSphere = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    let visible = true;
    let angleX = 0.3;
    let angleY = 0;
    let velX = 0;
    let velY = reduceMotion ? 0 : 0.004;
    const baseVelY = velY;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const render = () => {
      const radius = container.offsetWidth * 0.38;
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      SPHERE_POINTS.forEach((p, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        // rotate around Y then X
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2; // 0 = back, 1 = front
        const scale = 0.55 + depth * 0.65;
        el.style.transform = `translate3d(${x1 * radius}px, ${y2 * radius}px, 0) scale(${scale})`;
        el.style.opacity = String(0.25 + depth * 0.75);
        el.style.zIndex = String(Math.round(depth * 100));
        el.style.filter = depth < 0.35 ? `blur(${(0.35 - depth) * 6}px)` : "none";
      });
    };

    const loop = () => {
      if (!dragging) {
        velX *= 0.95;
        velY += (baseVelY - velY) * 0.03;
      }
      angleX += velX;
      angleY += velY;
      render();
      if (visible) raf = requestAnimationFrame(loop);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      velY = (e.clientX - lastX) * 0.005;
      velX = (e.clientY - lastY) * 0.005;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    observer.observe(container);

    container.addEventListener("pointerdown", onDown);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerup", onUp);
    container.addEventListener("pointercancel", onUp);
    render();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointercancel", onUp);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      data-cursor="hover"
      className="relative mx-auto aspect-square w-full max-w-[520px] touch-none select-none"
    >
      {/* glowing core */}
      <div className="absolute inset-[22%] rounded-full bg-candy opacity-30 blur-3xl" />
      <div className="absolute inset-[8%] rounded-full border border-dashed border-neon-violet/30 animate-spin-slow" />
      <div
        className="absolute inset-[18%] rounded-full border border-neon-pink/20 animate-spin-slow"
        style={{ animationDirection: "reverse" }}
      />

      <div className="absolute left-1/2 top-1/2">
        {skills.map((skill, i) => (
          <div
            key={skill.name}
            ref={(el) => (itemRefs.current[i] = el)}
            className="group absolute -ml-7 -mt-7 will-change-transform"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2.5 shadow-[0_8px_30px_-6px_hsl(var(--neon-violet)/0.5)] ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-125 sm:h-16 sm:w-16">
              <img src={skill.icon} alt={skill.name} className="h-full w-full object-contain" draggable={false} />
            </div>
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 font-mono text-[0.7rem] text-background opacity-0 transition-opacity group-hover:opacity-100">
              {skill.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SkillChip = ({ skill }: { skill: Skill }) => (
  <div className="glass group flex w-56 items-center gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 hover:border-neon-pink/60 hover:shadow-glow-pink sm:w-64">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-md transition-transform duration-300 group-hover:rotate-[-10deg] group-hover:scale-110">
      <img src={skill.icon} alt="" className="h-full w-full object-contain" loading="lazy" />
    </div>
    <div className="min-w-0">
      <h3 className="truncate font-display text-base font-bold">{skill.name}</h3>
      <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{skill.category}</p>
    </div>
  </div>
);

const Skills = () => {
  const firstRow = skills.slice(0, skills.length / 2);
  const secondRow = skills.slice(skills.length / 2);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32" id="skills">
      <div className="container">
        <SectionHeading
          index="03"
          eyebrow="skills"
          title="My Tech Galaxy"
          subtitle="Tools and technologies I love to build with. Grab the sphere and give it a spin!"
        />

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            className="relative"
          >
            <SkillSphere />
            <p className="mt-2 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
              <Hand className="h-4 w-4 animate-wiggle [animation-iteration-count:infinite] [animation-duration:2s]" />
              drag to spin
            </p>
          </motion.div>

          <div className="flex flex-col gap-6">
            <motion.p
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center text-lg leading-relaxed text-muted-foreground lg:text-left"
            >
              From pixel-perfect <span className="font-semibold text-neon-pink">frontends</span> to
              scalable <span className="font-semibold text-neon-violet">backends</span>, cross-platform{" "}
              <span className="font-semibold text-neon-cyan">mobile apps</span> and{" "}
              <span className="font-semibold text-neon-lime">AI/ML</span> experiments. I pick the right
              tool for the job and make it sing.
            </motion.p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30, rotateX: -60 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 120, damping: 12, delay: i * 0.12 }}
                  whileHover={{ y: -6, rotate: i === 1 ? 0 : i === 0 ? -3 : 3 }}
                  className="glass gradient-border rounded-3xl p-4 text-center sm:p-6"
                >
                  <p className="text-gradient font-display text-3xl font-extrabold sm:text-5xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tilted 3D marquee */}
      <div className="perspective mt-20">
        <div className="relative flex flex-col gap-4 [transform:rotateX(18deg)_rotateZ(-3deg)] preserve-3d">
          <Marquee pauseOnHover className="[--duration:40s]">
            {firstRow.map((skill) => (
              <SkillChip key={skill.name} skill={skill} />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:40s]">
            {secondRow.map((skill) => (
              <SkillChip key={skill.name} skill={skill} />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background sm:w-40" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background sm:w-40" />
        </div>
      </div>
    </section>
  );
};

export default Skills;
