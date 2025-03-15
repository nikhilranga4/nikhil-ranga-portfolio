import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Briefcase, Users } from "lucide-react";

const experiences = [
  {
    title: "Full Stack Developer Intern",
    company: "SimplifyTech",
    location: "Virtual",
    period: "Feb 2025 - Currently",
    description: "The internship focusing on New T3 stack(Next js, Next auth,prisma,Trpc and Tailwind css. Currently I'm working on the live client project,we are using the T3 tech stack for it and AWS for database,this is the advance live project includes both front-end and back-end development fully",
    type: "work"
  },
  {
    title: "Backend Development Intern",
    company: "O(1) Coding Club",
    location: "Virtual",
    period: "Jul 2023 - Feb 2024",
    description: "The internship focused on Django Backend Development",
    type: "work"
  },
  {
    title: "Member",
    company: "Google Developers Students Clubs (GDSCAU)",
    location: "Anurag University",
    period: "May 2023 - Present",
    type: "activity"
  },
];

const Experience = () => {
  return (
    <section className="py-20 bg-white dark:bg-background/30" id="experience">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-center mb-12"
        >
          Experience & Activities
        </motion.h2>

        <div className="max-w-3xl mx-auto">
          {experiences.map((exp, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="mb-8 relative"
            >
              {index !== experiences.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-full bg-black dark:bg-white"/>
              )}

              <Card className="relative flex items-start gap-6 p-6 hover:shadow-lg transition-shadow dark:bg-black/40 dark:backdrop-blur-sm dark:border-white">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  {exp.type === "work" ? (
                    <Briefcase className="w-6 h-6 text-primary" />
                  ) : (
                    <Users className="w-6 h-6 text-primary" />
                  )}
                </div>

                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-1">{exp.title}</h3>
                  <p className="text-muted-foreground mb-2">{exp.company}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary">{exp.period}</span>
                    {exp.location && (
                      <span className="text-muted-foreground">{exp.location}</span>
                    )}
                  </div>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
