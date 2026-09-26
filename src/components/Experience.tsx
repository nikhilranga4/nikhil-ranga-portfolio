import { Briefcase, Code2, Users } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import Timeline, { type TimelineItem } from "@/components/Timeline";

const experiences: TimelineItem[] = [
  {
    title: "Full Stack Developer Intern",
    subtitle: "SimplifyTech In",
    period: "Feb 2025 - Currently",
    meta: ["🌐 Virtual", "⚡ T3 Stack", "☁️ AWS"],
    description:
      "The internship focusing on New T3 stack(Next js, Next auth,prisma,Trpc and Tailwind css. Currently I'm working on the live client project,we are using the T3 tech stack for it and AWS for database,this is the advance live project includes both front-end and back-end development fully",
    icon: Briefcase,
    accent: 1,
  },
  {
    title: "Backend Development Intern",
    subtitle: "O(1) Coding Club",
    period: "Jul 2023 - Feb 2024",
    meta: ["🌐 Virtual", "🐍 Django"],
    description: "The internship focused on Django Backend Development",
    icon: Code2,
    accent: 2,
  },
  {
    title: "Member",
    subtitle: "Google Developers Students Clubs (GDSCAU)",
    period: "May 2023 - Present",
    meta: ["📍 Anurag University"],
    icon: Users,
    accent: 4,
  },
];

const Experience = () => {
  return (
    <section className="relative py-24 sm:py-32" id="experience">
      <div className="container">
        <SectionHeading
          index="02"
          eyebrow="experience"
          title="Experience & Activities"
          subtitle="Shipping real products, learning from real teams."
        />
        <Timeline items={experiences} />
      </div>
    </section>
  );
};

export default Experience;
