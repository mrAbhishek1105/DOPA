"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Cpu, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversation } from "@/hooks/use-conversation";

const PIPELINE_STEPS = [
  { label: "Parsing Requirements", icon: Cpu },
  { label: "Detecting Application Type", icon: Cpu },
  { label: "Matching Architecture Patterns", icon: Cpu },
  { label: "Preparing Next Question", icon: Cpu },
];

export function ConversationPanel({ projectId }: { projectId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isPending } = useConversation(projectId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
        <div className="space-y-3 pb-2">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "dopa" && (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5 shadow-sm">
                    <Cpu size={15} className="text-indigo-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-sm"
                  }`}
                >
                  {/* DOPA Architect header badge */}
                  {msg.role === "dopa" && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-700/30">
                      <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase">
                        DOPA Architect
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">
                        Senior Cloud Architect
                      </span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center mt-0.5">
                    <User size={14} className="text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pipeline progress indicator (replaces fake thinking) */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5 shadow-sm">
                <Cpu size={15} className="text-indigo-400" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl rounded-bl-sm px-3.5 py-2.5 text-sm text-slate-400 min-w-[180px]">
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-700/30">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase">
                    DOPA Architect
                  </span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div
                      key={step.label}
                      className={`flex items-center gap-2 text-[11px] ${
                        i === 0
                          ? "text-blue-400"
                          : i <= 0
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    >
                      {i < 0 ? (
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      ) : i === 0 ? (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                      )}
                      {step.label}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}