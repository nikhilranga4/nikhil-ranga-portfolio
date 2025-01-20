import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Github } from "lucide-react";

const projects = [
  {
    title: "Reddit Clone",
    description: "Reddit clone using ReactJS, TypeScript and ViteJS with Reddit backend API. Features post fetching based on topics and search functionality.",
    image: "/placeholder.svg",
    demo: "https://reddit-clone2.netlify.app/",
    github: "https://github.com/nikhilranga4/Reddit-clone",
    date: "Jan 2025",
    tags: ["React", "TypeScript", "Vite", "API Integration"]
  },
  {
    title: "Movie Review App",
    description: "React Native application that fetches movie details via API calls and displays them on movie cards. Combines frontend and backend development.",
    image: "/placeholder.svg",
    github: "https://github.com/nikhilranga4/MovieApp",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Mobile Development"]
  },
  {
    title: "User Directory App",
    description: "React Native app fetching user profiles via API calls, featuring beautiful animations and styles.",
    image: "/placeholder.svg",
    demo: "https://fyxxsv-8083.csb.app/",
    github: "https://github.com/nikhilranga4/User_Directory",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Animations"]
  },
  {
    title: "User Authentication App",
    description: "React Native authentication app using async storage for user credentials validation.",
    image: "/placeholder.svg",
    demo: "https://6mtttq-8082.csb.app/",
    github: "https://github.com/nikhilranga4/AuthApp",
    date: "Dec 2024",
    tags: ["React Native", "Authentication", "Async Storage"]
  },
  {
    title: "ROS Log Viewer",
    description: "React application for filtering log/txt files. Built with Node.js backend and React frontend.",
    image: "/placeholder.svg",
    demo: "https://roslogviewer.netlify.app/",
    github: "https://github.com/nikhilranga4/ROS_Log_Viewer-Frontend",
    date: "Nov 2024",
    tags: ["React", "Node.js", "Full Stack"]
  },
  {
    title: "Tic Tac Toe Game",
    description: "React Native implementation of the classic Tic Tac Toe game.",
    image: "/placeholder.svg",
    github: "https://github.com/nikhilranga4/Tic-Tac-Toe-React-NativeApp",
    date: "Aug 2024",
    tags: ["React Native", "Game Development"]
  },
  {
    title: "Tinder Style Swipe Cards",
    description: "React Native animation project implementing Tinder-style card swiping.",
    image: "/placeholder.svg",
    demo: "https://snack.expo.dev/@nikhil_tony/github.com-nikhiltony26-swipeanimation_app",
    date: "Feb 2024",
    tags: ["React Native", "Animations"]
  },
  {
    title: "Image Gallery App",
    description: "Personal project for image gallery management in React Native.",
    image: "/placeholder.svg",
    github: "https://github.com/nikhiltony26/My-Gallery-App",
    date: "Feb 2024",
    tags: ["React Native", "Image Processing"]
  },
  {
    title: "Eye Blink Detection System",
    description: "Driver drowsiness detection system using eye blink detection.",
    image: "/placeholder.svg",
    github: "https://github.com/nikhiltony26/Eye_Blink_Detection_System",
    date: "Jun 2023 - Nov 2023",
    tags: ["Computer Vision", "Python", "AI/ML"]
  }
];

const Projects = () => {
  return (
    <section className="py-20 bg-background relative" id="projects">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-center mb-12"
        >
          Projects
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow dark:bg-gray-800/50 dark:border-gray-700">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">{project.title}</h3>
                    <span className="text-sm text-muted-foreground">{project.date}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">{project.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm dark:bg-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-auto">
                    {project.demo && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.demo} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Demo
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={project.github} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        Code
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;