import { motion } from "framer-motion";
import Marquee from "./ui/marquee";

const skills = [
  {
    name: "React",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    category: "Frontend",
    color: "#61DAFB"
  },
  {
    name: "TypeScript",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    category: "Languages",
    color: "#3178C6"
  },
  {
    name: "JavaScript",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    category: "Languages",
    color: "#F7DF1E"
  },

  {
    name: "Python",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    category: "Languages",
    color: "#F5792A"
  },
  {
    name: "HTML",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    category: "Frontend",
    color: "#E34F26"
  },
  {
    name: "CSS",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
    category: "Frontend",
    color: "#1572B6"
  },
  {
    name: "MongoDB",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
    category: "Database",
    color: "#47A248"
  },
  {
    name: "React Native",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    category: "Mobile",
    color: "#61DAFB"
  },
  {
    name: "Git",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
    category: "Tools",
    color: "#F05032"
  },
  {
    name: "GitHub",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original-wordmark.svg",
    category: "Tool",
    color: "#21759B"
  },
  {
    name: "Figma",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
    category: "Design",
    color: "#F24E1E"
  },
  {
    name: "Linux",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg",
    category: "Tools",
    color: "#FCC624"
  },
  {
    name: "Android Studio",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/androidstudio/androidstudio-original.svg",
    category: "Tool",
    color: "#F5792A"
  },
  {
    name: "Django",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg",
    category: "Python framework",
    color: "#F5792A"
  },
  {
    name: "Netlify",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/netlify/netlify-original.svg",
    category: "Deployment platform",
    color: "#F5792A"
  },
  {
    name: "NodeJS",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain-wordmark.svg",
    category: "Backend language",
    color: "#F5792A"
  },
   {
    name: "TailwindCSS",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg",
    category: "CSS Framework",
    color: "#F5792A"
  },
  {
    name: "Ubuntu",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-original.svg",
    category: "Operating System",
    color: "#F5792A"
  },
  {
    name: "Vercel",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vercel/vercel-original.svg",
    category: "Hosting platform",
    color: "#F5792A"
  },
  {
    name: "Mysql",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original-wordmark.svg",
    category: "Database",
    color: "#F5792A"
  }
];

const SkillCard = ({ skill }: { skill: typeof skills[0] }) => {
  return (
    <div className="relative w-48 sm:w-64 cursor-pointer overflow-hidden rounded-xl border p-3 mx-2
                    border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]
                    dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 p-2 shadow-md">
          <img
            src={skill.icon}
            alt={skill.name}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <h3 className="text-base font-semibold">{skill.name}</h3>
          <p className="text-xs text-muted-foreground">{skill.category}</p>
        </div>
      </div>
    </div>
  );
};

const Skills = () => {
  const firstRow = skills.slice(0, skills.length / 2);
  const secondRow = skills.slice(skills.length / 2);

  return (
    <section className="py-12 sm:py-20 relative" id="skills">
      <div
        className="absolute inset-0 -z-10 dark:bg-gray-900/50 bg-white/50 backdrop-blur-xl"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(var(--primary-rgb), 0.1) 0%, transparent 70%)`,
        }}
      >
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="currentColor"
                className="text-primary/20 dark:text-primary/10"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="container relative z-10 px-4 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12"
        >
          Skills
        </motion.h2>

        <div className="relative flex flex-col gap-6 overflow-hidden">
          <Marquee pauseOnHover className="[--duration:30s]">
            {firstRow.map((skill, index) => (
              <SkillCard key={index} skill={skill} />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:30s]">
            {secondRow.map((skill, index) => (
              <SkillCard key={index} skill={skill} />
            ))}
          </Marquee>

          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background" />
        </div>
      </div>
    </section>
  );
};

export default Skills;