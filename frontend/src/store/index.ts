import { create } from 'zustand';
import { Project } from '@/types/project';
import { RecommendationOption } from '@/types/recommendation';
import { GraphNode } from '@/types/graph';

export interface ChatMessage {
  id: string;
  role: "user" | "dopa";
  content: string;
}

interface DopaState {
  // Client-only UI state
  currentProject: Project | null;
  selectedRecommendation: RecommendationOption | null;
  selectedNode: GraphNode | null;
  theme: 'dark' | 'light';
  
  // Layout state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;

  // Chat State (scoped by project ID)
  messagesByProject: Record<string, ChatMessage[]>;
  isChatActiveByProject: Record<string, boolean>;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setSelectedRecommendation: (rec: RecommendationOption | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLeftSidebarOpen: (isOpen: boolean) => void;
  setRightSidebarOpen: (isOpen: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  addMessage: (projectId: string, msg: ChatMessage) => void;
  setMessages: (projectId: string, msgs: ChatMessage[]) => void;
  setIsChatActive: (projectId: string, active: boolean) => void;
}

export const useStore = create<DopaState>((set) => ({
  currentProject: null,
  selectedRecommendation: null,
  selectedNode: null,
  theme: 'dark',
  leftSidebarOpen: true, // Open by default
  rightSidebarOpen: false, // Closed by default until prompt is submitted
  messagesByProject: {},
  isChatActiveByProject: {},

  setCurrentProject: (project) => set({ currentProject: project }),
  setSelectedRecommendation: (rec) => set({ selectedRecommendation: rec }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setTheme: (theme) => set({ theme }),
  setLeftSidebarOpen: (isOpen) => set({ leftSidebarOpen: isOpen }),
  setRightSidebarOpen: (isOpen) => set({ rightSidebarOpen: isOpen }),
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  addMessage: (projectId, msg) => set((state) => ({ 
    messagesByProject: {
      ...state.messagesByProject,
      [projectId]: [...(state.messagesByProject[projectId] || []), msg]
    }
  })),
  setMessages: (projectId, msgs) => set((state) => ({ 
    messagesByProject: {
      ...state.messagesByProject,
      [projectId]: msgs
    }
  })),
  setIsChatActive: (projectId, active) => set((state) => ({ 
    isChatActiveByProject: {
      ...state.isChatActiveByProject,
      [projectId]: active
    }
  })),
}));

