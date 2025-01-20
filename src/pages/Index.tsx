import { useEffect } from "react";
import ScrollReveal from "scrollreveal";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Education from "@/components/Education";
import Experience from "@/components/Experience";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

const Index = () => {
  useEffect(() => {
    ScrollReveal().reveal(".scroll-reveal", {
      delay: 200,
      distance: "20px",
      duration: 800,
      easing: "cubic-bezier(0.5, 0, 0, 1)",
      interval: 100,
      opacity: 0,
      origin: "bottom",
      rotate: { x: 0, y: 0, z: 0 },
      scale: 1,
      cleanup: true,
      container: window.document.documentElement,
      desktop: true,
      mobile: true,
      reset: false,
      useDelay: "always",
      viewFactor: 0.2,
      viewOffset: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="fixed top-4 right-4 z-50">
          <ModeToggle />
        </div>
        
        <main className="relative z-10">
          <Hero />
          <Education />
          <Experience />
          <Skills />
          <Projects />
          <Footer />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Index;