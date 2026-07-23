"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Cpu, CheckCircle2, FileText, Shield, Layers } from "lucide-react";
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
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "summary">("chat");

  const { messages, isPending } = useConversation(projectId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Animate pipeline step progression while pending
  useEffect(() => {
    if (!isPending) {
      setActiveStep(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveStep((prev) =>
        prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 1200);
    return () => clearInterval(interval);
  }, [isPending]);

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl">
      {/* Architect Review Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2 bg-slate-950 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === "chat" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Conversation
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === "summary" ? "bg-slate-800/80 text-slate-200 border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === "chat" && (
          <ScrollArea className="h-full pr-2" ref={scrollRef}>
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
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                          : "bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "dopa" && (
                        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
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

              {/* Pipeline progress indicator */}
              {isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5 shadow-sm">
                    <Cpu size={15} className="text-indigo-400" />
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl rounded-bl-sm px-3.5 py-2.5 text-xs text-slate-400 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
                      <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase">
                        DOPA Architect
                      </span>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {PIPELINE_STEPS.map((step, i) => (
                        <div
                          key={step.label}
                          className={`flex items-center gap-2 text-[11px] transition-colors duration-300 ${
                            i < activeStep
                              ? "text-emerald-400"
                              : i === activeStep
                              ? "text-blue-400"
                              : "text-slate-600"
                          }`}
                        >
                          {i < activeStep ? (
                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                          ) : i === activeStep ? (
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
        )}

        {activeTab === "summary" && (
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Understood Requirements Summary</h4>
            <div className="space-y-1 text-slate-300">
              <div>• <strong>App Type:</strong> E-Commerce Marketplace</div>
              <div>• <strong>Region:</strong> AWS ap-south-1 (Mumbai)</div>
              <div>• <strong>Target Scale:</strong> 100,000 Registered Users</div>
              <div>• <strong>Database:</strong> PostgreSQL Multi-AZ</div>
              <div>• <strong>Cache:</strong> ElastiCache Redis</div>
              <div>• <strong>Availability:</strong> 99.99% Multi-AZ SLA</div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}