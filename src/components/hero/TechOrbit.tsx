const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const INNER = [
  { name: "React", icon: `${DEVICON}/react/react-original.svg` },
  { name: "TypeScript", icon: `${DEVICON}/typescript/typescript-original.svg` },
  { name: "Python", icon: `${DEVICON}/python/python-original.svg` },
  { name: "Node.js", icon: `${DEVICON}/nodejs/nodejs-original.svg` },
];

const OUTER = [
  { name: "MongoDB", icon: `${DEVICON}/mongodb/mongodb-original.svg` },
  { name: "Tailwind CSS", icon: `${DEVICON}/tailwindcss/tailwindcss-original.svg` },
  { name: "Django", icon: `${DEVICON}/django/django-plain.svg` },
  { name: "Git", icon: `${DEVICON}/git/git-original.svg` },
  { name: "Figma", icon: `${DEVICON}/figma/figma-original.svg` },
];

interface RingProps {
  items: { name: string; icon: string }[];
  radius: number;
  duration: number;
  reverse?: boolean;
  chip: number;
}

/**
 * A ring lying in a tilted plane. The ring spins around its own axis while every logo
 * counter-rotates so it keeps facing the viewer.
 */
const Ring = ({ items, radius, duration, reverse, chip }: RingProps) => {
  const timing = { animationDuration: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" } as const;
  return (
    <div
      className="absolute animate-orbit-ring preserve-3d"
      style={{ width: radius * 2, height: radius * 2, left: `calc(50% - ${radius}px)`, top: `calc(50% - ${radius}px)`, ...timing }}
    >
      <div className="absolute inset-0 rounded-full border border-dashed border-brand-2/50 shadow-[0_0_24px_hsl(var(--brand-2)/0.25)]" />
      {items.map((item, i) => {
        const angle = (i / items.length) * 360;
        return (
          <div
            key={item.name}
            className="absolute left-1/2 top-1/2 preserve-3d"
            style={{ transform: `rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)` }}
          >
            <div className="animate-orbit-counter preserve-3d" style={timing}>
              <div
                title={item.name}
                className="flex items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_20px_-6px_hsl(var(--brand-2)/0.6)] ring-1 ring-black/5"
                style={{ width: chip, height: chip, marginLeft: -chip / 2, marginTop: -chip / 2 }}
              >
                <img src={item.icon} alt={item.name} className="h-full w-full object-contain" draggable={false} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Tech logos orbiting a glowing code core on two tilted rings. */
const TechOrbit = () => {
  return (
    <div className="relative h-full min-h-[12rem] w-full overflow-hidden [perspective:700px]">
      <Ring items={OUTER} radius={118} duration={30} reverse chip={36} />
      <Ring items={INNER} radius={66} duration={18} chip={34} />
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-candy font-mono text-base font-bold text-white shadow-glow-2">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-2/50" />
        <span className="relative">&lt;/&gt;</span>
      </div>
    </div>
  );
};

export default TechOrbit;
