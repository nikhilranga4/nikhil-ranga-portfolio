import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [loadingPercentage, setLoadingPercentage] = useState(0);

  useEffect(() => {
    // Simulate loading percentage increment
    const interval = setInterval(() => {
      setLoadingPercentage((prev) => {
        if (prev < 100) return prev + 1;
        clearInterval(interval);
        return 100;
      });
    }, 30); // Adjust the speed of the percentage increment

    // Hide loading spinner after reaching 100%
    if (loadingPercentage === 100) {
      const timeout = setTimeout(() => {
        setLoading(false);
        clearTimeout(timeout);
      }, 500); // Slight delay to transition from spinner to content
    }

    return () => clearInterval(interval);
  }, [loadingPercentage]);

  useEffect(() => {
    // Initialize ScrollReveal
    ScrollReveal().reveal(".scroll-reveal", {
      delay: 200,
      distance: "20px",
      duration: 800,
      easing: "cubic-bezier(0.5, 0, 0, 1)",
      interval: 100,
      opacity: 0,
      origin: "top",
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
      {/* Loading Spinner */}
      {loading ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 text-foreground">
          <div className="w-16 h-16 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-semibold">{loadingPercentage}%</p>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
          <AnimatedBackground />

          {/* Mode Toggle */}
          <div className="fixed top-4 right-4 z-50">
            <ModeToggle />
          </div>

          {/* Main Content */}
          <main className="relative z-10">
            <Hero />
            <Education />
            <Experience />
            <Skills />
            <Projects />
            <Footer />
          </main>
        </div>
      )}
    </ThemeProvider>
  );
};

export default Index;
