"use client";

import { use } from "react";
import WorkspaceLayout from "@/components/workspace-layout";
import { CanvasWorkspace } from "@/components/canvas-workspace";
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
        
        {/* Main Dashboard Area */}
        <AnimatePresence>
          {isChatActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col min-h-0 p-5 space-y-4"
            >
              {/* Main Workspace Pane: Canvas-First View */}
              <div className="flex-1 min-h-0">
                <CanvasWorkspace projectId={id} />
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
