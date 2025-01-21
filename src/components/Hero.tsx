import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const letterAnimation = {
  hidden: { opacity: 0, y: 50 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 },
  }),
};

const Hero = () => {
  const [showResume, setShowResume] = useState(false);

  const handleViewResumeClick = () => {
    setShowResume(!showResume); // Toggle resume visibility
  };

  const handleCloseResume = () => {
    setShowResume(false); // Close the resume preview
  };

  const title = "Full Stack Developer | AI/ML Engineer".split("");

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary to-secondary/20">
      <div className="absolute inset-0 w-full h-full">
        <div id="particles-js"></div>
      </div>

      <div className="container mx-auto px-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Name */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-black dark:text-white">
            Nikhil Ranga
          </h1>

          {/* Career Objective */}
          <p className="text-base sm:text-lg md:text-xl mb-4 text-gray-700 dark:text-gray-300">
            Passionate full-stack developer with expertise in React and React
            Native, dedicated to creating innovative web and mobile solutions.
            Committed to continuous learning and delivering high-quality,
            user-centric applications.
          </p>

          {/* Animated Title */}
          <motion.div
            className="text-lg sm:text-xl md:text-2xl font-semibold mb-8 text-black dark:text-white flex justify-center gap-1 flex-wrap"
            initial="hidden"
            animate="visible"
          >
            {title.map((char, index) => (
              <motion.span
                key={index}
                custom={index}
                variants={letterAnimation}
                className="inline-block"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.div>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="flex items-center justify-center w-full sm:w-auto"
            >
              <a
                href="https://github.com/nikhilranga4"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-5 w-5" />
                GitHub
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="flex items-center justify-center w-full sm:w-auto"
            >
              <a
                href="https://www.linkedin.com/in/nikhilranga21"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="mr-2 h-5 w-5" />
                LinkedIn
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="flex items-center justify-center w-full sm:w-auto"
            >
              <a href="mailto:nikhilranga43@gmail.com">
                <Mail className="mr-2 h-5 w-5" />
                Email
              </a>
            </Button>
          </div>

          {/* View Resume Button */}
          <Button
            size="lg"
            className="bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white"
            onClick={handleViewResumeClick}
          >
            View Resume
          </Button>

          {/* Resume Image */}
          {showResume && (
            <div className="relative mt-8">
              {/* Close button */}
              <button
                onClick={handleCloseResume}
                className="absolute top-2 right-2 text-white bg-red-600 rounded-full p-2 hover:bg-red-700"
              >
                X
              </button>

              <motion.img
                src="/NR-resume.png" // Replace with your resume image path
                alt="Resume"
                className="w-full max-w-3xl mx-auto mt-8 rounded-lg shadow-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
