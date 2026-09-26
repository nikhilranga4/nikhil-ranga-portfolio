import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { TiltCard } from "@/components/ui/tilt-card";

const GitHubContributions = () => {
  return (
    <section className="relative py-24 sm:py-32" id="github">
      <div className="container">
        <SectionHeading
          index="05"
          eyebrow="open source"
          title="GitHub Contributions"
          subtitle="My open source journey and activity"
        />

        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 25 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ type: "spring", stiffness: 70, damping: 16 }}
          className="perspective mx-auto max-w-5xl"
        >
          <div className="gradient-border is-active relative rounded-[2rem] p-5 sm:p-8">
            <div className="glass absolute inset-0 rounded-[2rem]" />

            <div className="relative">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <a
                  href="https://github.com/nikhilranga4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3"
                >
                  <span className="bg-candy flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow-pink transition-transform group-hover:rotate-12">
                    <Github className="h-6 w-6" />
                  </span>
                  <span className="font-display text-xl font-bold transition-colors group-hover:text-neon-pink">
                    @nikhilranga4
                  </span>
                </a>
                <a
                  href="https://github.com/nikhilranga4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip px-4 py-2 text-sm text-foreground transition-colors hover:border-neon-pink hover:text-neon-pink"
                >
                  Follow on GitHub <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-4 shadow-inner">
                <img
                  src="https://ghchart.rshah.org/ff3ea5/nikhilranga4"
                  alt="GitHub Contribution Calendar"
                  loading="lazy"
                  className="h-auto w-full min-w-[640px]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <TiltCard max={8}>
                  <img
                    src="https://github-readme-stats-sigma-five.vercel.app/api?username=nikhilranga4&show_icons=true&theme=radical&hide_border=true&count_private=true&border_radius=20"
                    alt="GitHub Stats"
                    loading="lazy"
                    className="h-auto w-full rounded-2xl shadow-glow-violet"
                  />
                </TiltCard>
                <TiltCard max={8}>
                  <img
                    src="https://github-readme-streak-stats.herokuapp.com/?user=nikhilranga4&theme=radical&hide_border=true&border_radius=20"
                    alt="GitHub Streak Stats"
                    loading="lazy"
                    className="h-auto w-full rounded-2xl shadow-glow-pink"
                  />
                </TiltCard>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GitHubContributions;
