import { createContext, useContext } from "react";

interface IntroState {
  /**
   * Whether the intro loader has started revealing the site. The page is mounted underneath the
   * loader before this flips, so entrance animations wait for it instead of playing out of sight.
   */
  revealed: boolean;
  /** Called by the hero's 3D scene once its shaders are compiled and it has drawn a frame. */
  sceneReady: () => void;
}

export const IntroContext = createContext<IntroState>({ revealed: true, sceneReady: () => undefined });

export const useIntroRevealed = () => useContext(IntroContext).revealed;

export const useIntroSceneReady = () => useContext(IntroContext).sceneReady;
