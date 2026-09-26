import { Component, Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Education from "@/components/Education";
import Experience from "@/components/Experience";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import Background from "@/components/Background";
import FloatingShapes from "@/components/FloatingShapes";
import GitHubContributions from "@/components/GitHubContributions";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import SmoothScroll from "@/components/SmoothScroll";

const Stage3D = lazy(() => import("@/components/three/Stage3D"));

/** If WebGL fails for the overlay, just drop it — the page works fine without it. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Global 3D overlay: the 3D cursor (mouse users) and the scroll-guide robot. */
const GlobalStage = () => {
  const { colors, buddy } = useTheme();
  const reduceMotion = !!useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    setFinePointer(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const cursor = finePointer && !reduceMotion;
  if (!cursor && !buddy) return null;

  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <Stage3D colors={colors} cursor={cursor} robot={buddy} reduceMotion={reduceMotion} />
      </Suspense>
    </SilentBoundary>
  );
};

const Index = () => {
  const [loading, setLoading] = useState(true);
  const handleLoaded = useCallback(() => setLoading(false), []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AnimatePresence>{loading && <Loader onDone={handleLoaded} />}</AnimatePresence>

      {!loading && (
        <SmoothScroll>
          <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
            <Background />
            <ScrollProgress />
            <CustomCursor />
            <GlobalStage />
            <Navbar />

            <main className="relative z-10">
              <FloatingShapes />
              <Hero />
              <About />
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
        </SmoothScroll>
      )}
    </ThemeProvider>
  );
};

export default Index;
