"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

interface AnimatedPromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  isCentered?: boolean;
  isComplete?: boolean;
}

export function AnimatedPromptInput({ onSubmit, isLoading, isCentered = true, isComplete = false }: AnimatedPromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || isComplete) return;
    onSubmit(prompt);
    setPrompt(""); // Clear the input after submission
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <motion.div
      layout
      className={`w-full max-w-3xl mx-auto px-4 ${isCentered ? "mb-0" : "mb-6 mt-4"}`}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      {isCentered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-semibold mb-3 text-slate-100">
            What infrastructure are we building today?
          </h1>
          <p className="text-slate-400">
            Describe your architecture requirements, e.g., "A highly available microservices cluster on AWS"
          </p>
        </motion.div>
      )}

      <motion.form
        layout
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 bg-slate-900/60 border ${
          isCentered ? "border-slate-700/80 shadow-2xl" : "border-slate-800/60 shadow-lg"
        } rounded-2xl p-2 backdrop-blur-md transition-colors duration-200 focus-within:border-blue-500/50`}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isComplete}
          placeholder={isComplete ? "Requirements complete — architecture locked." : "Type your request here..."}
          className="flex-1 max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-slate-200 placeholder:text-slate-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          rows={1}
        />
        <div className="flex shrink-0 items-center justify-center p-2">
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading || isComplete}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
