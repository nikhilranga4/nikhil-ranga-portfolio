import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowUpRight, Bot, ChevronLeft, ChevronRight, Github, Globe, Smartphone } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import { Magnetic } from "@/components/ui/magnetic";
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
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "mobile", label: "Mobile" },
  { id: "ai", label: "AI/ML" },
];

const categoryOf = (project: Project): Exclude<Category, "all"> => {
  if (project.tags.includes("AI/ML")) return "ai";
  if (project.tags.includes("React Native")) return "mobile";
  return "web";
};

const CATEGORY_META = {
  web: { label: "Web app", icon: Globe },
  mobile: { label: "Mobile app", icon: Smartphone },
  ai: { label: "AI / ML", icon: Bot },
} as const;

const hostOf = (url?: string) => {
  if (!url) return "localhost";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

// ── Device frames ──────────────────────────────────────────────────────────

const BrowserFrame = ({ project }: { project: Project }) => (
  <div className="w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[0_40px_80px_-30px_hsl(var(--brand-2)/0.55)]">
    <div className="flex items-center gap-2 border-b border-border bg-muted/70 px-3 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md bg-background/80 px-2.5 py-1 font-mono text-[0.65rem] text-muted-foreground">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-4" />
        {hostOf(project.demo)}
      </span>
    </div>
    <div className="aspect-[16/10] bg-muted">
      <img src={project.image} alt={project.title} className="h-full w-full object-cover object-top" />
    </div>
  </div>
);

const PhoneFrame = ({ project }: { project: Project }) => (
  <div className="relative w-[min(15rem,62vw)] rounded-[2.6rem] border border-border bg-foreground/90 p-2.5 shadow-[0_40px_80px_-30px_hsl(var(--brand-2)/0.6)]">
    <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
    <div className="aspect-[9/19] overflow-hidden rounded-[2rem] bg-muted">
      <img src={project.image} alt={project.title} className="h-full w-full object-cover object-top" />
    </div>
  </div>
);

const MonitorFrame = ({ project }: { project: Project }) => (
  <div className="w-full max-w-md">
    <div className="overflow-hidden rounded-xl border-[10px] border-foreground/90 bg-black shadow-[0_40px_80px_-30px_hsl(var(--brand-2)/0.55)]">
      <div className="flex items-center justify-between bg-black px-3 py-1.5 font-mono text-[0.62rem] text-brand-4">
        <span>● REC python detect.py</span>
        <span>model: live</span>
      </div>
      <div className="aspect-[4/3]">
        <img src={project.image} alt={project.title} className="h-full w-full object-cover object-top" />
      </div>
    </div>
    <div className="mx-auto h-6 w-16 bg-foreground/80 [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]" />
    <div className="mx-auto h-2 w-36 rounded-full bg-foreground/80" />
  </div>
);

const Device = ({ project }: { project: Project }) => {
  const cat = categoryOf(project);
  if (cat === "mobile") return <PhoneFrame project={project} />;
  if (cat === "ai") return <MonitorFrame project={project} />;
  return <BrowserFrame project={project} />;
};

// ── Section ────────────────────────────────────────────────────────────────

const Projects = () => {
  const [filter, setFilter] = useState<Category>("all");
  const visible = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => categoryOf(p) === filter)),
    [filter],
  );
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const project = visible[Math.min(index, visible.length - 1)];
  const number = projects.indexOf(project) + 1;
  const cat = categoryOf(project);
  const CatIcon = CATEGORY_META[cat].icon;

  useEffect(() => setIndex(0), [filter]);

  // Keep the active item in view inside the list (desktop) and thumbnail strip (phones)
  useEffect(() => {
    for (const box of [listRef.current, stripRef.current]) {
      const el = box?.querySelector<HTMLElement>(`[data-index="${index}"]`);
      if (!box || !el) continue;
      if (box === listRef.current)
        box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
      else box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    }
  }, [index, filter]);

  const go = (next: number) => {
    const n = (next + visible.length) % visible.length;
    setDir(n > index || (index === visible.length - 1 && n === 0) ? 1 : -1);
    setIndex(n);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    go(index + step);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1);
    else if (info.offset.x > 60) go(index - 1);
  };

  return (
    <section className="relative py-16 sm:py-24 lg:py-28" id="projects">
      <div className="container">
        <SectionHeading
          index="04"
          eyebrow="projects"
          title="Things I've Built"
          subtitle="Pick a project from the list (or swipe the device) to preview it in its natural habitat."
        />

        {/* Filters */}
        <div className="mb-8 flex justify-center sm:mb-10">
          <div
            role="tablist"
            aria-label="Project type"
            className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none]"
          >
            {FILTERS.map((f) => {
              const count = f.id === "all" ? projects.length : projects.filter((p) => categoryOf(p) === f.id).length;
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "relative isolate flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
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
                  <span className={cn("font-mono text-[0.65rem]", filter === f.id ? "opacity-80" : "opacity-60")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <ScrollReveal3D tilt={20}>
          <div
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label="Project showcase. Use arrow keys to browse."
            className="grid gap-6 rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-brand-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-8"
          >
            {/* Stage */}
            <div className="gradient-border is-active relative overflow-hidden rounded-[2rem]">
              <div className="glass absolute inset-0" />
              <div
                aria-hidden
                className="grid-bg absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
              />
              <div
                aria-hidden
                className="absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-1/25 blur-3xl"
              />

              <div className="relative flex flex-col">
                {/* Device */}
                <div className="relative flex min-h-[19rem] items-center justify-center px-5 pb-4 pt-8 sm:min-h-[24rem] sm:px-10">
                  <span className="absolute left-5 top-5 font-mono text-xs text-muted-foreground">
                    <span className="font-display text-2xl font-bold text-foreground">
                      {String(number).padStart(2, "0")}
                    </span>{" "}
                    / {String(projects.length).padStart(2, "0")}
                  </span>
                  <span className="chip absolute right-5 top-5 text-brand-1">
                    <CatIcon className="h-3.5 w-3.5" />
                    {CATEGORY_META[cat].label}
                  </span>
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                      key={project.title}
                      custom={dir}
                      variants={{
                        enter: (d: number) => ({ opacity: 0, x: d * 80, rotateY: d * -25, scale: 0.92 }),
                        center: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
                        exit: (d: number) => ({ opacity: 0, x: d * -80, rotateY: d * 25, scale: 0.92 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 180, damping: 22 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.25}
                      onDragEnd={onDragEnd}
                      style={{ transformPerspective: 1200 }}
                      className="flex w-full cursor-grab justify-center pt-6 active:cursor-grabbing"
                    >
                      <Device project={project} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Details */}
                <div className="relative border-t border-border/60 bg-background/40 p-5 backdrop-blur-sm sm:p-7">
                  <div className="absolute right-5 top-5 z-10 flex gap-2 sm:right-7 sm:top-7">
                    <button
                      type="button"
                      aria-label="Previous project"
                      onClick={() => go(index - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/60 transition-colors hover:border-brand-1 hover:text-brand-1"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next project"
                      onClick={() => go(index + 1)}
                      className="bg-candy flex h-10 w-10 items-center justify-center rounded-full text-on-grad shadow-glow-1 transition-transform hover:scale-105"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={project.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 pr-24">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-brand-1">{project.date}</p>
                          <h3 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">
                            {project.title}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{project.description}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg border border-border bg-background/50 px-2.5 py-1 font-mono text-[0.7rem]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {project.demo && (
                          <Magnetic strength={0.25}>
                            <a
                              href={project.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-candy group/demo inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-on-grad shadow-glow-1"
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
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-brand-2 hover:text-brand-2"
                          >
                            <Github className="h-4 w-4" />
                            Source code
                          </a>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Desktop: numbered project index */}
            <div className="glass relative hidden flex-col overflow-hidden rounded-[2rem] lg:flex">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Index</p>
                <p className="font-mono text-xs text-muted-foreground">{visible.length} projects</p>
              </div>
              <div
                ref={listRef}
                data-lenis-prevent
                role="listbox"
                aria-label="Projects"
                className="relative max-h-[38rem] flex-1 overflow-y-auto p-2"
              >
                {visible.map((p, i) => {
                  const c = categoryOf(p);
                  const Icon = CATEGORY_META[c].icon;
                  const isActive = i === index;
                  return (
                    <button
                      key={p.title}
                      data-index={i}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => go(i)}
                      className={cn(
                        "group relative isolate flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="project-index"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute inset-0 -z-10 rounded-2xl bg-muted ring-1 ring-brand-1/40"
                        />
                      )}
                      <span className="w-7 shrink-0 font-mono text-xs">
                        {String(projects.indexOf(p) + 1).padStart(2, "0")}
                      </span>
                      <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                        <img
                          src={p.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-semibold">{p.title}</span>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Icon className="h-3 w-3 text-brand-1" />
                          {CATEGORY_META[c].label} · {p.date}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-all",
                          isActive
                            ? "text-brand-1"
                            : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phones & tablets: thumbnail strip */}
            <div
              ref={stripRef}
              className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
            >
              {visible.map((p, i) => (
                <button
                  key={p.title}
                  data-index={i}
                  type="button"
                  aria-label={p.title}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={cn(
                    "relative w-28 shrink-0 overflow-hidden rounded-2xl text-left ring-1 transition-all",
                    i === index ? "ring-2 ring-brand-1" : "opacity-60 ring-border",
                  )}
                >
                  <span className="block aspect-[4/3] bg-muted">
                    <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                  </span>
                  <span className="block truncate bg-background/80 px-2 py-1.5 text-[0.7rem] font-semibold">
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal3D>
      </div>
    </section>
  );
};

export default Projects;
