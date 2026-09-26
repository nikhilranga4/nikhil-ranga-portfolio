import { BookOpen, GraduationCap, School } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import Timeline, { type TimelineItem } from "@/components/Timeline";

const education: TimelineItem[] = [
  {
    title: "Sreyas Institute of Engineering and Technology",
    subtitle: "BTech in Computer Science (AI & ML)",
    period: "2020 - 2024",
    meta: ["📍 Hyderabad", "🎯 CGPA: 7.13"],
    icon: GraduationCap,
    accent: "pink",
  },
  {
    title: "Vishra Junior College",
    subtitle: "Intermediate, MPC",
    period: "2018 - 2020",
    meta: ["📍 Hyderabad", "🎯 Grade: 71%"],
    icon: BookOpen,
    accent: "violet",
  },
  {
    title: "Geethanjali High School",
    subtitle: "SSC",
    period: "2017 - 2018",
    meta: ["📍 Nagarkurnool", "🎯 GPA: 8.5"],
    icon: School,
    accent: "cyan",
  },
];

const Education = () => {
  return (
    <section className="relative py-24 sm:py-32" id="education">
      <div className="container">
        <SectionHeading
          index="01"
          eyebrow="education"
          title="Where I Learned"
          subtitle="The classrooms and late-night labs that shaped how I think and build."
        />
        <Timeline items={education} />
      </div>
    </section>
  );
};

export default Education;
