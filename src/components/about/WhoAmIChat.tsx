import { Fragment, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { from: "them" | "me"; content: ReactNode };

const Hl = ({ children }: { children: ReactNode }) => <span className="text-gradient font-semibold">{children}</span>;

const STACK = ["React", "React Native", "TypeScript", "Node.js", "Python", "AI/ML"];

const CONVERSATION: Message[] = [
  { from: "them", content: "Hey! So… who are you? 👀" },
  {
    from: "me",
    content: (
      <>
        Hi, I&apos;m <Hl>Nikhil</Hl> 👋 a full-stack developer from Hyderabad who loves building{" "}
        <Hl>playful, high-performance</Hl> web &amp; mobile experiences.
      </>
    ),
  },
  { from: "them", content: "Nice. What do you build with?" },
  {
    from: "me",
    content: (
      <span className="flex flex-wrap gap-1.5">
        {STACK.map((s) => (
          <span key={s} className="rounded-full bg-background/60 px-2.5 py-1 font-mono text-[0.72rem] font-medium ring-1 ring-border">
            {s}
          </span>
        ))}
      </span>
    ),
  },
  { from: "them", content: "And what are you up to right now?" },
  {
    from: "me",
    content: (
      <>
        Shipping a live client project at <Hl>SimplifyTech</Hl> on the T3 stack: Next.js, tRPC, Prisma and AWS. 🚀
      </>
    ),
  },
  { from: "them", content: "What drives you?" },
  {
    from: "me",
    content: (
      <>
        Turning ideas into products people <Hl>genuinely enjoy using</Hl>, and learning something new every day. ✨
      </>
    ),
  },
];

/** "Who I am" told as a chat thread: bubbles pop in one by one as the section scrolls into view. */
const WhoAmIChat = () => (
  <div className="gradient-border relative overflow-hidden rounded-[1.75rem]">
    <div className="glass absolute inset-0" />
    <div className="relative">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="relative">
          <span className="bg-candy flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold text-on-grad">
            NR
          </span>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-brand-4 ring-2 ring-background" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold leading-tight">Nikhil Ranga</p>
          <p className="text-xs text-brand-4">online · usually building something</p>
        </div>
        <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">// who I am</span>
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-2.5 px-3 py-5 sm:px-5">
        {CONVERSATION.map((m, i) => {
          const mine = m.from === "me";
          const lastOfRun = CONVERSATION[i + 1]?.from !== m.from;
          return (
            <Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, delay: mine ? 0.35 : 0.05 }}
                style={{ transformOrigin: mine ? "100% 100%" : "0% 100%" }}
                className={cn("flex max-w-[88%] flex-col", mine ? "items-end self-end" : "items-start self-start")}
              >
                <div
                  className={cn(
                    "px-4 py-2.5 text-[0.95rem] leading-relaxed sm:text-base",
                    mine
                      ? "rounded-2xl rounded-br-md bg-muted/80 text-foreground ring-1 ring-brand-1/25"
                      : "rounded-2xl rounded-bl-md bg-background/60 text-foreground/80 ring-1 ring-border"
                  )}
                >
                  {m.content}
                </div>
                {mine && lastOfRun && (
                  <span className="mt-1 flex items-center gap-1 pr-1 font-mono text-[0.6rem] text-muted-foreground">
                    seen <CheckCheck className="h-3 w-3 text-brand-1" />
                  </span>
                )}
              </motion.div>
            </Fragment>
          );
        })}

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-background/60 px-4 py-3 ring-1 ring-border"
          aria-label="Typing"
        >
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  </div>
);

export default WhoAmIChat;
