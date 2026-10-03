import { ArrowUpRight, Github } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ScrollReveal3D } from "@/components/ui/scroll-reveal";
import SectionHeading from "@/components/SectionHeading";
import { TiltCard } from "@/components/ui/tilt-card";

const hex = (color: string) => color.replace("#", "");

const GitHubContributions = () => {
  const { colors } = useTheme();
  const [c1, c2, c3, bg, fg] = [colors.c1, colors.c2, colors.c3, colors.background, colors.foreground].map(hex);
  const statsUrl =
    "https://github-readme-stats-sigma-five.vercel.app/api?username=nikhilranga4&show_icons=true&hide_border=true&count_private=true&border_radius=20" +
    `&bg_color=${bg}&title_color=${c1}&icon_color=${c3}&text_color=${fg}&ring_color=${c2}`;
  const streakUrl =
    "https://github-readme-streak-stats.herokuapp.com/?user=nikhilranga4&hide_border=true&border_radius=20" +
    `&background=${bg}&ring=${c1}&fire=${c1}&currStreakNum=${fg}&sideNums=${fg}&currStreakLabel=${c1}&sideLabels=${c3}&dates=${fg}&stroke=${c2}`;

  return (
    <section className="relative py-16 sm:py-24 lg:py-28" id="github">
      <div className="container">
        <SectionHeading
          index="05"
          eyebrow="open source"
          title="GitHub Contributions"
          subtitle="My open source journey and activity"
        />

        <ScrollReveal3D tilt={45} className="mx-auto max-w-5xl">
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
                  <span className="bg-candy flex h-12 w-12 items-center justify-center rounded-2xl text-on-grad shadow-glow-1 transition-transform group-hover:rotate-12">
                    <Github className="h-6 w-6" />
                  </span>
                  <span className="font-display text-xl font-bold transition-colors group-hover:text-brand-1">
                    @nikhilranga4
                  </span>
                </a>
                <a
                  href="https://github.com/nikhilranga4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip px-4 py-2 text-sm text-foreground transition-colors hover:border-brand-1 hover:text-brand-1"
                >
                  Follow on GitHub <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-4 shadow-inner">
                <img
                  src={`https://ghchart.rshah.org/${c1}/nikhilranga4`}
                  alt="GitHub Contribution Calendar"
                  loading="lazy"
                  className="h-auto w-full min-w-[640px]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <TiltCard max={8}>
                  <img
                    src={statsUrl}
                    alt="GitHub Stats"
                    loading="lazy"
                    className="h-auto w-full rounded-2xl shadow-glow-2"
                  />
                </TiltCard>
                <TiltCard max={8}>
                  <img
                    src={streakUrl}
                    alt="GitHub Streak Stats"
                    loading="lazy"
                    className="h-auto w-full rounded-2xl shadow-glow-1"
                  />
                </TiltCard>
              </div>
            </div>
          </div>
        </ScrollReveal3D>
      </div>
    </section>
  );
};

export default GitHubContributions;
