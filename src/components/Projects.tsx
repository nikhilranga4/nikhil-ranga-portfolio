import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Github } from "lucide-react";

const projects = [
  {
    title: "Reddit Clone",
    description: "Reddit clone using ReactJS, TypeScript and ViteJS with Reddit backend API. Features post fetching based on topics and search functionality.",
    image: "/reddit-clone.png",
    demo: "https://reddit-clone2.netlify.app/",
    github: "https://github.com/nikhilranga4/Reddit-clone",
    date: "Jan 2025",
    tags: ["React", "TypeScript", "Vite", "API Integration"]
  },
  {
    title: "Movie Review App",
    description: "React Native application that fetches movie details via API calls and displays them on movie cards. Combines frontend and backend development.",
    image: "/movie-review.png",
    demo: "expo.dev/artifacts/eas/oaUDk2pEkgyVLK5vYFAaED.apk",
    github: "https://github.com/nikhilranga4/MovieApp",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Mobile Development"]
  },
  {
    title: "Restaurant Table Bookings",
    description: "React as frontend and nodejs for backend.User can book a table based on the time and date slot.",
    image: "/resturant.png",
    demo: "https://restaurant-table-bookings.netlify.app/",
    github: "https://github.com/nikhilranga4/Restaurant-booking-frontend",
    date: "Dec 2024",
    tags: ["React", "CRUD Operations", "API Integration", "Nodejs", "MongoDB", "MERN Fullstack", "Expressjs"]
  },
  {
    title: "User Directory App",
    description: "React Native app fetching user profiles via API calls, featuring beautiful animations and styles.",
    image: "/user-directory.png",
    demo: "https://fyxxsv-8083.csb.app/",
    github: "https://github.com/nikhilranga4/User_Directory",
    date: "Dec 2024",
    tags: ["React Native", "API Integration", "Animations"]
  },
  {
    title: "User Authentication App",
    description: "React Native authentication app using async storage for user credentials validation.",
    image: "/user-auth.png",
    demo: "https://6mtttq-8082.csb.app/",
    github: "https://github.com/nikhilranga4/AuthApp",
    date: "Dec 2024",
    tags: ["React Native", "Authentication", "Async Storage"]
  },
  {
    title: "ROS Log Viewer",
    description: "React application for filtering log/txt files. Built with Node.js backend and React frontend.",
    image: "/ros-log.png",
    demo: "https://roslogviewer.netlify.app/",
    github: "https://github.com/nikhilranga4/ROS_Log_Viewer-Frontend",
    date: "Nov 2024",
    tags: ["React", "Node.js", "Full Stack"]
  },
  {
    title: "Tic Tac Toe Game",
    description: "React Native implementation of the classic Tic Tac Toe game.",
    image: "/tic-tac-toe.png",
    demo: "https://snack.expo.dev/@nikhil_tony/github.com-nikhilranga4-tic-tac-toe-react-nativeapp?platform=ios",
    github: "https://github.com/nikhilranga4/Tic-Tac-Toe-React-NativeApp",
    date: "Aug 2024",
    tags: ["React Native", "Game Development"]
  },
  {
    title: "Tinder Style Swipe Cards",
    description: "React Native animation project implementing Tinder-style card swiping.",
    image: "/card-swipe.png",
    demo: "https://snack.expo.dev/@nikhil_tony/github.com-nikhiltony26-swipeanimation_app",
    date: "Feb 2024",
    tags: ["React Native", "Animations"]
  },
  {
    title: "Image Gallery App",
    description: "Personal project for image gallery management in React Native.",
    image: "/image-gallery.png",
    demo: "https://ln9plc-8082.csb.app/",
    github: "https://github.com/nikhiltony26/My-Gallery-App",
    date: "Feb 2024",
    tags: ["React Native", "Image Processing"]
  },
  {
    title: "Eye Blink Detection System",
    description: "Driver drowsiness detection system using eye blink detection.",
    image: "/eye-blink.png",
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
              <Card
                className="h-full overflow-hidden transition-all transform hover:scale-105 hover:z-10 hover:shadow-2xl dark:bg-gray-800/50 dark:border-gray-700"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">{project.title}</h3>
                    <span className="text-sm font-semibold" style={{ color: "green" }}>{project.date}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">{project.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 opacity-4 bg-gradient-to-r from-gray-400 to-gray-400 text-white rounded-full text-sm"
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
