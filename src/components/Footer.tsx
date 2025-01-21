import { Github, Linkedin, Mail, Phone, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Footer = () => {
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        const response = await fetch(
          "https://api.countapi.xyz/hit/nikhilranga-portfolio/visits"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch visitor count");
        }
        const data = await response.json();
        setVisitorCount(data.value);
      } catch (error) {
        console.error("Error fetching visitor count:", error);
        setVisitorCount(1); // Fallback value if the API fails
      }
    };

    fetchVisitorCount();
  }, []);

  return (
    <footer className="bg-background py-12 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <h3 className="text-2xl font-bold mb-2">Nikhil Ranga</h3>
            <p className="text-muted-foreground">
              Full Stack Developer | AI/ML Engineer
            </p>
          </div>

          <div className="flex gap-6">
            <a
              href="https://github.com/nikhiltony26"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-6 h-6" />
            </a>
            <a
              href="https://www.linkedin.com/in/nikhilranga21"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="w-6 h-6" />
            </a>
            <a
              href="mailto:nikhilranga43@gmail.com"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-6 h-6" />
            </a>
            <a
              href="tel:+917989068826"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-6 h-6" />
            </a>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center space-y-2"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="font-semibold"
            >
              {visitorCount.toLocaleString()} visitors
            </motion.span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nikhil Ranga. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
