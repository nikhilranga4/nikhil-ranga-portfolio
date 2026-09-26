import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Education from "@/components/Education";
import Experience from "@/components/Experience";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import Background from "@/components/Background";
import GitHubContributions from "@/components/GitHubContributions";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const handleLoaded = useCallback(() => setLoading(false), []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AnimatePresence>{loading && <Loader onDone={handleLoaded} />}</AnimatePresence>

      {!loading && (
        <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
          <Background />
          <ScrollProgress />
          <CustomCursor />
          <Navbar />

          <main className="relative z-10">
            <Hero />
            <Education />
            <Experience />
            <Skills />
            <Projects />
            <GitHubContributions />
          </main>
          <div className="relative z-10">
            <Footer />
          </div>
        </div>
      )}
    </ThemeProvider>
  );
};

export default Index;
