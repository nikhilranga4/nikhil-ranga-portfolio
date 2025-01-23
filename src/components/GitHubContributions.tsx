import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Github } from "lucide-react";

const GitHubContributions = () => {
  return (
    <section className="py-20 relative z-10" id="github">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-gray-900 dark:text-white">
            GitHub Contributions
          </h2>
          <p className="text-muted-foreground dark:text-gray-400">
            My open source journey and activity
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          <Card className="p-6 dark:bg-black/40 dark:backdrop-blur-sm dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Github className="w-6 h-6 text-gray-900 dark:text-white" />
                <a
                  href="https://github.com/nikhilranga4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold hover:text-primary transition-colors text-gray-900 dark:text-white"
                >
                  @nikhilranga4
                </a>
              </div>
            </div>

            <div className="space-y-6">
              {/* GitHub Contribution Calendar */}
              <div className="w-full overflow-hidden rounded-lg">
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={`https://ghchart.rshah.org/1a237e/nikhilranga4`}
                  alt="GitHub Contribution Calendar"
                  className="w-full h-auto rounded-lg bg-white/5 p-4"
                />
              </div>

              {/* GitHub Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                <motion.img
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  src="https://github-readme-stats-sigma-five.vercel.app/api?username=nikhilranga4&show_icons=true&theme=dark&hide_border=true&count_private=true"
                  alt="GitHub Stats"
                  className="w-full h-auto rounded-lg"
                />
                <motion.img
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  src="https://github-readme-streak-stats.herokuapp.com/?user=nikhilranga4&theme=dark&hide_border=true&background=00000000"
                  alt="GitHub Streak Stats"
                  className="w-full h-auto rounded-lg bg-black"
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default GitHubContributions;
