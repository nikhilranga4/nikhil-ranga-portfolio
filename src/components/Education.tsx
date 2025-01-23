import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { GraduationCap } from "lucide-react";

const education = [
  {
    school: "Sreyas Institute of Engineering and Technology",
    degree: "BTech in Computer Science (AI & ML)",
    location: "Hyderabad",
    period: "2020 - 2024",
    grade: "CGPA: 7.13"
  },
  {
    school: "Vishra Junior College",
    degree: "Intermediate, MPC",
    location: "Hyderabad",
    period: "2018 - 2020",
    grade: "Grade: 71%"
  },
  {
    school: "Geethanjali High School",
    degree: "SSC",
    location: "Nagarkurnool",
    period: "2017 - 2018",
    grade: "GPA: 8.5"
  }
];

const Education = () => {
  return (
    <section className="py-20 bg-background relative" id="education">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-center mb-12"
        >
          Education
        </motion.h2>

        <div className="max-w-3xl mx-auto">
          {education.map((edu, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="mb-8 relative"
            >
              {/* Timeline line */}
              {index !== education.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-full bg-black dark:bg-white" />
              )}

              <Card className="relative flex items-start gap-6 p-6 hover:shadow-lg transition-shadow">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-1">{edu.school}</h3>
                  <p className="text-muted-foreground mb-2">{edu.degree}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary text-red-900">{edu.period}</span>
                    <span className="font-medium text-green-900">{edu.grade}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{edu.location}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Education;
