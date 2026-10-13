import { Briefcase, FolderKanban, Github, GraduationCap, Home, User, Zap } from "lucide-react";

/** Page sections shown in the desktop nav and the mobile menu. */
export const NAV_ITEMS = [
  { id: "home", label: "Home", emoji: "🏠", icon: Home, hint: "Start here" },
  { id: "about", label: "About", emoji: "👋", icon: User, hint: "Who I am" },
  { id: "education", label: "Education", emoji: "🎓", icon: GraduationCap, hint: "Where I studied" },
  { id: "experience", label: "Experience", emoji: "💼", icon: Briefcase, hint: "Where I've worked" },
  { id: "skills", label: "Skills", emoji: "⚡", icon: Zap, hint: "My toolkit" },
  { id: "projects", label: "Projects", emoji: "🚀", icon: FolderKanban, hint: "Things I've built" },
  { id: "github", label: "GitHub", emoji: "🐙", icon: Github, hint: "Open-source activity" },
] as const;

export const MOBILE_MENU_ID = "mobile-menu";
