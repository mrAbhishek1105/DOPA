"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { conversationApi } from "@/lib/api/conversation";
import { projectsApi } from "@/lib/api/projects";
import { generationApi } from "@/lib/api/generation";
import { useStore, ChatMessage } from "@/store";
import { useEffect } from "react";

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function useConversation(projectId: string) {
  const queryClient = useQueryClient();
  const { messagesByProject, setMessages, addMessage, setIsChatActive } = useStore();
  const messages = messagesByProject[projectId] || [];

  // Initialize first message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages(projectId, [
        { id: nextId(), role: "dopa", content: "Hi, I'm DOPA Architect. I help you design cloud infrastructure.\n\nTell me about the application you're building — what it does, who uses it, and any constraints like budget or compliance.\n\nI'll guide you through the requirements and generate a production-ready architecture." },
      ]);
    }
  }, [messages.length, setMessages, projectId]);

  const { data: statusData } = useQuery({
    queryKey: ["status", projectId],
    queryFn: () => projectsApi.getStatus(projectId),
    refetchInterval: 3000,
  });

  const isComplete = statusData?.status !== "discovery";

  // If the project is not new (already has requirements or isn't in discovery), set chat active
  useEffect(() => {
    if (statusData && (statusData.status !== "discovery" || messages.length > 1)) {
      setIsChatActive(projectId, true);
    }
  }, [statusData, messages.length, setIsChatActive, projectId]);

  const generateMutation = useMutation({
    mutationFn: (id: string) => generationApi.generateRecommendations(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: () => {
      addMessage(projectId, { id: nextId(), role: "dopa", content: "⚠️ Failed to generate recommendations. Check backend logs." });
    }
  });

  const mutation = useMutation({
    mutationFn: (message: string) => conversationApi.sendMessage({ project_id: projectId, message }),
    onSuccess: (data) => {
      let replyContent: string;

      // Prefer the Response Builder's crafted message
      if (data.builder_message) {
        replyContent = data.builder_message;
        
        // Trigger recommendation generation if requirements just completed
        if (data.is_complete && !generateMutation.isPending) {
          generateMutation.mutate(projectId);
        }
      } else if (data.is_complete) {
        replyContent = "✅ All requirements gathered! Generating your options now...";
        if (!generateMutation.isPending) {
          generateMutation.mutate(projectId);
        }
      } else if (data.next_question) {
        replyContent = data.next_question;
      } else if (data.missing_fields && data.missing_fields.length > 0) {
        const fields = data.missing_fields.map((f: string) => f.replace(/_/g, " ")).join(", ");
        replyContent = `Got it. I still need to know about: **${fields}**.`;
      } else {
        replyContent = "Understood. Can you provide more details about your application?";
      }

      addMessage(projectId, { 
        id: nextId(), 
        role: "dopa", 
        content: replyContent,
        suggested_replies: data.suggested_replies,
        field_being_asked: data.field_being_asked,
      });
      queryClient.invalidateQueries({ queryKey: ["status", projectId] });
      queryClient.invalidateQueries({ queryKey: ["requirements", projectId] });
    },
    onError: () => {
      addMessage(projectId, { id: nextId(), role: "dopa", content: "⚠️ Connection to backend failed. Make sure the API server is running." });
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim() || mutation.isPending) return;
    setIsChatActive(projectId, true);
    addMessage(projectId, { id: nextId(), role: "user", content: text });
    mutation.mutate(text);
  };

  return {
    messages,
    sendMessage,
    isPending: mutation.isPending,
    isComplete,
  };
}
