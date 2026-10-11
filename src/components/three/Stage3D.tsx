import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { PaletteColors } from "@/lib/palettes";
import Cursor3D from "./Cursor3D";
import RobotGuide from "./RobotGuide";

interface Stage3DProps {
  colors: PaletteColors;
  cursor: boolean;
  robot: boolean;
  reduceMotion: boolean;
}

/**
 * Full-screen, click-through WebGL overlay hosting the 3D cursor and the scroll-guide robot.
 * One canvas for both keeps it to a single extra WebGL context.
 */
const Stage3D = ({ colors, cursor, robot, reduceMotion }: Stage3DProps) => {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] transition-opacity duration-300 [html.menu-open_&]:opacity-0">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 6]} intensity={2} />
        <pointLight position={[-5, -3, 4]} intensity={40} color={colors.c2} />

        <Environment resolution={128}>
          <Lightformer form="rect" intensity={4} color="#ffffff" position={[3, 4, 5]} scale={[6, 3, 1]} />
          <Lightformer form="ring" intensity={3} color={colors.c1} position={[-4, 1, 3]} scale={3} />
          <Lightformer form="rect" intensity={3} color={colors.c3} position={[4, -3, -2]} scale={[3, 3, 1]} />
        </Environment>

        {cursor && <Cursor3D colors={colors} />}
        {robot && (
          <Suspense fallback={null}>
            <RobotGuide colors={colors} reduceMotion={reduceMotion} />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
};

export default Stage3D;
