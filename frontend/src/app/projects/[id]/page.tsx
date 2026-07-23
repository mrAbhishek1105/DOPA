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
    setRightSidebarOpen(true);
  };

  return (
    <WorkspaceLayout 
      projectId={id} 
      showRightSidebar={isChatActive}
    >
      <div className="flex flex-col h-full overflow-hidden relative">
        
        {/* Main Dashboard Area */}
        <AnimatePresence mode="wait">
          {isChatActive ? (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 p-5 space-y-4"
            >
              <div className="flex-1 min-h-0">
                <CanvasWorkspace projectId={id} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-50"
            >
              <AnimatedPromptInput 
                onSubmit={handleInitialSubmit} 
                isLoading={isPending} 
                isCentered={true}
                isComplete={isComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </WorkspaceLayout>
  );
}