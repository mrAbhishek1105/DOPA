"use client";

import { use } from "react";
import WorkspaceLayout from "@/components/workspace-layout";
import { RecommendationCards } from "@/components/recommendation-cards";
import { GraphCanvas } from "@/components/graph-canvas";
import { AnimatedPromptInput } from "@/components/animated-prompt-input";
import { useConversation } from "@/hooks/use-conversation";
import { useStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isChatActiveByProject = useStore((s) => s.isChatActiveByProject);
  const isChatActive = isChatActiveByProject[id] || false;
  const setRightSidebarOpen = useStore((s) => s.setRightSidebarOpen);
  const { sendMessage, isPending, isComplete } = useConversation(id);

  const handleInitialSubmit = (prompt: string) => {
    sendMessage(prompt);
    // When the first prompt is sent, automatically open the right sidebar for the conversation
    setRightSidebarOpen(true);
  };

  return (
    <WorkspaceLayout projectId={id} showRightSidebar={isChatActive}>
      <div className="flex flex-col h-full overflow-hidden relative">
        
        {/* Main Canvas Area */}
        <AnimatePresence>
          {isChatActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col min-h-0 p-4 space-y-4"
            >
              {/* Recommendations */}
              <div className="shrink-0 rounded-xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm p-4 h-44">
                <h2 className="text-sm font-semibold mb-2 text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Architecture Options
                </h2>
                <RecommendationCards projectId={id} />
              </div>

              {/* Graph Canvas */}
              <div className="flex-1 rounded-xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm overflow-hidden relative">
                <GraphCanvas projectId={id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State Centering Wrapper */}
        <div className={`w-full flex shrink-0 ${!isChatActive ? "absolute inset-0 flex-col items-center justify-center" : "pt-2 pb-4"}`}>
          <AnimatedPromptInput 
            onSubmit={handleInitialSubmit} 
            isLoading={isPending} 
            isCentered={!isChatActive}
            isComplete={isComplete}
          />
        </div>
        
      </div>
    </WorkspaceLayout>
  );
}
