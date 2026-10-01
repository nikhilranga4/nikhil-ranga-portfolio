import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Github } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { Magnetic } from "@/components/ui/magnetic";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Project {
  title: string;
  description: string;
  image: string;
  demo?: string;
  github?: string;
  date: string;
  tags: string[];
}

const projects: Project[] = [
  {
    title: "Leaderboard points",
    description:
      "Leaderboard using ReactJS TypeScript and ViteJS.User can add members into the table and ask for points to each, so this code will produce random points for selected member randomly and based on points the members will be updated in the points table ",
    image: "/leaderboard.png",
    demo: "https://leaderboard8.netlify.app/",
    github: "https://github.com/nikhilranga4/Leaderboard-frontend",
    date: "Jan 2025",
    tags: ["React", "TypeScript", "Vite", "NodeJs"],
  },
  {
    title: "Reddit Clone",
    description:
      "Reddit clone using ReactJS, TypeScript and ViteJS with Reddit backend API. Features post fetching based on topics and search functionality.",
    image: "/reddit-clone.png",
    demo: "https://reddit-clone2.netlify.app/",
    github: "https://github.com/nikhilranga4/Reddit-clone",
    date: "Jan 2025",
    tags: ["React", "TypeScript", "Vite", "API Integration"],
  },
  {
    title: "Movie Review App",
    description:
      "React Native application that fetches movie details via API calls and displays them on movie cards. Combines frontend and backend development.",
    image: "/movie-review.png",
    demo: "https://expo.dev/artifacts/eas/oaUDk2pEkgyVLK5vYFAaED.apk",
    github: "https://github.com/nikhilranga4/MovieApp",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Mobile Development"],
  },
  {
    title: "Restaurant Table Bookings",
    description: "React as frontend and nodejs for backend.User can book a table based on the time and date slot.",
    image: "/resturant.png",
    demo: "https://restaurant-table-bookings.netlify.app/",
    github: "https://github.com/nikhilranga4/Restaurant-booking-frontend",
    date: "Dec 2024",
    tags: ["React", "CRUD Operations", "API Integration", "Nodejs", "MongoDB", "MERN Fullstack", "Expressjs"],
  },
  {
    title: "User Directory App",
    description: "React Native app fetching user profiles via API calls, featuring beautiful animations and styles.",
    image: "/user-directory.png",
    demo: "https://fyxxsv-8083.csb.app/",
    github: "https://github.com/nikhilranga4/User_Directory",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Animations"],
  },
  {
    title: "User Authentication App",
    description: "React Native authentication app using async storage for user credentials validation.",
    image: "/user-auth.png",
    demo: "https://6mtttq-8082.csb.app/",
    github: "https://github.com/nikhilranga4/AuthApp",
    date: "Dec 2024",
    tags: ["React Native", "Authentication", "Async Storage"],
  },
  {
    title: "ROS Log Viewer",
    description: "React application for filtering log/txt files. Built with Node.js backend and React frontend.",
    image: "/ros-log.png",
    demo: "https://roslogviewer.netlify.app/",
    github: "https://github.com/nikhilranga4/ROS_Log_Viewer-Frontend",
    date: "Nov 2024",
    tags: ["React", "Node.js", "Full Stack"],
  },
  {
    title: "Tic Tac Toe Game",
    description: "React Native implementation of the classic Tic Tac Toe game.",
    image: "/tic-tac-toe.png",
    demo: "https://snack.expo.dev/@nikhil_tony/github.com-nikhilranga4-tic-tac-toe-react-nativeapp?platform=ios",
    github: "https://github.com/nikhilranga4/Tic-Tac-Toe-React-NativeApp",
    date: "Aug 2024",
    tags: ["React Native", "Game Development"],
  },
  {
    title: "Tinder Style Swipe Cards",
    description: "React Native animation project implementing Tinder-style card swiping.",
    image: "/card-swipe.png",
    demo: "https://snack.expo.dev/@nikhil_tony/github.com-nikhiltony26-swipeanimation_app",
    date: "Feb 2024",
    tags: ["React Native", "Animations"],
  },
  {
    title: "Image Gallery App",
    description: "Personal project for image gallery management in React Native.",
    image: "/image-gallery.png",
    demo: "https://ln9plc-8082.csb.app/",
    github: "https://github.com/nikhiltony26/My-Gallery-App",
    date: "Feb 2024",
    tags: ["React Native", "Image Processing"],
  },
  {
    title: "Eye Blink Detection System",
    description: "Driver drowsiness detection system using eye blink detection.",
    image: "/eye-blink.png",
    github: "https://github.com/nikhiltony26/Eye_Blink_Detection_System",
    date: "Jun 2023 - Nov 2023",
    tags: ["Computer Vision", "Python", "AI/ML"],
  },
];

type Category = "all" | "web" | "mobile" | "ai";

const FILTERS: { id: Category; label: string }[] = [
  { id: "all", label: "✨ All" },
  { id: "web", label: "🌐 Web" },
  { id: "mobile", label: "📱 Mobile" },
  { id: "ai", label: "🤖 AI/ML" },
];

const categoryOf = (project: Project): Exclude<Category, "all"> => {
  if (project.tags.includes("AI/ML")) return "ai";
  if (project.tags.includes("React Native")) return "mobile";
  return "web";
};

const TAG_COLORS = [
  "text-brand-1 border-brand-1/30",
  "text-brand-2 border-brand-2/30",
  "text-brand-3 border-brand-3/30",
  "text-brand-4 border-brand-4/30",
];

const ProjectCard = ({ project, index, featured }: { project: Project; index: number; featured: boolean }) => (
  <TiltCard max={featured ? 6 : 10}>
    <article
      className={cn(
        "gradient-border relative flex h-full flex-col rounded-3xl p-3 preserve-3d",
        featured && "lg:flex-row lg:gap-2",
      )}
    >
      <div className="glass absolute inset-0 rounded-3xl transition-shadow duration-500 group-hover:shadow-[0_30px_80px_-20px_hsl(var(--brand-1)/0.45)]" />

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-muted [transform:translateZ(20px)]",
          featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[360px] lg:w-[58%] lg:shrink-0" : "aspect-[16/10]",
        )}
      >
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110",
            featured ? "object-left-top" : "object-top",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="chip absolute left-3 top-3 border-white/20 bg-black/50 text-white backdrop-blur-md">
          {project.date}
        </span>
        <span className="absolute bottom-2 right-3 font-display text-5xl font-extrabold text-white/25">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div
        className={cn(
          "relative flex flex-1 flex-col px-3 pb-3 pt-5 [transform:translateZ(40px)]",
          featured && "lg:justify-center lg:px-5",
        )}
      >
        {featured && <span className="chip mb-3 w-fit text-brand-4">★ Featured</span>}
        <h3 className={cn("mb-2 font-display font-bold leading-tight", featured ? "text-2xl sm:text-3xl" : "text-xl")}>
          {project.title}
        </h3>
        <p className={cn("mb-4 text-sm leading-relaxed text-muted-foreground", !featured && "line-clamp-3")}>
          {project.description}
        </p>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {project.tags.map((tag, i) => (
            <span key={tag} className={cn("chip", TAG_COLORS[i % TAG_COLORS.length])}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-2.5 sm:gap-3">
          {project.demo && (
            <Magnetic strength={0.25}>
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-candy group/demo inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold sm:px-5 text-on-grad shadow-glow-1 transition-transform hover:scale-105"
              >
                Live demo
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/demo:-translate-y-0.5 group-hover/demo:translate-x-0.5" />
              </a>
            </Magnetic>
          )}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold sm:px-5 transition-all hover:-translate-y-0.5 hover:border-brand-2 hover:text-brand-2"
            >
              <Github className="h-4 w-4" />
              Code
            </a>
          )}
        </div>
      </div>
    </article>
  </TiltCard>
);

/** Phone layout: a swipeable, snapping row of cards with a counter, arrows and progress dots. */
const ProjectCarousel = ({ items }: { items: Project[] }) => {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    setActive(0);
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      setActive(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items]);

  const go = (index: number) => {
    const el = track.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 20, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={track}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((project, i) => (
          <motion.div
            key={project.title}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20, delay: Math.min(i, 3) * 0.06 }}
            className="w-[84%] max-w-sm shrink-0 snap-center"
          >
            <ProjectCard project={project} index={projects.indexOf(project)} featured={false} />
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-xs text-muted-foreground">
          <span className="text-base font-bold text-foreground">{String(active + 1).padStart(2, "0")}</span>
          {" / "}
          {String(items.length).padStart(2, "0")}
        </span>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {items.map((p, i) => (
            <button
              key={p.title}
              type="button"
              aria-label={`Go to ${p.title}`}
              onClick={() => go(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "bg-candy w-6" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous project"
            onClick={() => go(Math.max(0, active - 1))}
            disabled={active === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 transition-opacity disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next project"
            onClick={() => go(Math.min(items.length - 1, active + 1))}
            disabled={active === items.length - 1}
            className="bg-candy flex h-10 w-10 items-center justify-center rounded-full text-on-grad shadow-glow-1 transition-opacity disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const [filter, setFilter] = useState<Category>("all");
  const visible = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => categoryOf(p) === filter)),
    [filter],
  );
  const isMobile = useIsMobile();

  return (
    <section className="relative py-16 sm:py-24 lg:py-28" id="projects">
      <div className="container">
        <SectionHeading
          index="04"
          eyebrow="projects"
          title="Things I've Built"
          subtitle={
            isMobile
              ? "A playground of web apps, mobile apps and AI experiments. Swipe to explore."
              : "A playground of web apps, mobile apps and AI experiments. Hover a card to feel the depth."
          }
        />

        <div className="mb-8 flex justify-center sm:mb-12">
          <div className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative isolate shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors sm:px-5",
                  filter === f.id ? "text-on-grad" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter === f.id && (
                  <motion.span
                    layoutId="project-filter"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="bg-candy absolute inset-0 -z-10 rounded-full shadow-glow-1"
                  />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isMobile ? (
          <ProjectCarousel items={visible} />
        ) : (
          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((project, i) => {
                const featured = i === 0 && visible.length > 2;
                return (
                  <motion.div
                    key={project.title}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                    className={cn(featured && "sm:col-span-2")}
                  >
                    <ScrollReveal3D
                      direction={featured ? 0 : i % 3 === 0 ? -1 : i % 3 === 2 ? 1 : 0}
                      className="h-full"
                    >
                      <ProjectCard project={project} index={projects.indexOf(project)} featured={featured} />
                    </ScrollReveal3D>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Projects;
