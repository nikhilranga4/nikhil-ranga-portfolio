import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * The tagger adds `data-component-*` attributes to every JSX element. react-three-fiber reads
 * dashed props as nested paths (`data.component.path`) on three.js objects and the scene crashes
 * (the robot, 3D cursor and hero world silently disappear in dev), so 3D components stay untagged.
 */
function taggerExceptThree() {
  const tagger = componentTagger();
  return {
    ...tagger,
    transform(code: string, id: string) {
      if (id.replace(/\\/g, "/").includes("/src/components/three/")) return null;
      return tagger.transform(code, id);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    taggerExceptThree(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // three.js is split out automatically via the lazy 3D imports
    chunkSizeWarningLimit: 1200,
  },
}));
