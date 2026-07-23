import { create } from 'zustand';
import { Project } from '@/types/project';
import { RecommendationOption } from '@/types/recommendation';
import { GraphNode } from '@/types/graph';
import type { Node, Edge } from '@xyflow/react';

export interface ChatMessage {
  id: string;
  role: "user" | "dopa";
  content: string;
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  nodes: Node[];
  edges: Edge[];
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

  // ─── Shared Graph State ────────────────────────────────────────
  graphNodes: Node[];
  graphEdges: Edge[];
  graphHistory: HistoryEntry[];
  historyHead: number; // index into graphHistory (current position)
  graphInitialized: boolean;

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

  // Graph actions
  initGraph: (nodes: Node[], edges: Edge[]) => void;
  commitGraph: (nodes: Node[], edges: Edge[], label: string) => void;
  setGraphNodes: (nodes: Node[]) => void;
  setGraphEdges: (edges: Edge[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function makeEntry(nodes: Node[], edges: Edge[], label: string): HistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    timestamp: Date.now(),
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  };
}

export const useStore = create<DopaState>((set, get) => ({
  currentProject: null,
  selectedRecommendation: null,
  selectedNode: null,
  theme: 'dark',
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  messagesByProject: {},
  isChatActiveByProject: {},

  graphNodes: [],
  graphEdges: [],
  graphHistory: [],
  historyHead: -1,
  graphInitialized: false,

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

  // ─── Graph Actions ─────────────────────────────────────────────

  /** Load initial graph from API (only once, or on reset) */
  initGraph: (nodes, edges) => {
    const entry = makeEntry(nodes, edges, 'Initial Architecture');
    set({
      graphNodes: nodes,
      graphEdges: edges,
      graphHistory: [entry],
      historyHead: 0,
      graphInitialized: true,
    });
  },

  /** Push a new commit into history, trim any future (redo) states */
  commitGraph: (nodes, edges, label) => {
    const state = get();
    // Trim anything after current head (redo branch is discarded)
    const trimmed = state.graphHistory.slice(0, state.historyHead + 1);
    const entry = makeEntry(nodes, edges, label);
    const newHistory = [...trimmed, entry];
    set({
      graphNodes: nodes,
      graphEdges: edges,
      graphHistory: newHistory,
      historyHead: newHistory.length - 1,
    });
  },

  setGraphNodes: (nodes) => set({ graphNodes: nodes }),
  setGraphEdges: (edges) => set({ graphEdges: edges }),

  undo: () => {
    const state = get();
    if (state.historyHead <= 0) return;
    const newHead = state.historyHead - 1;
    const entry = state.graphHistory[newHead];
    set({
      graphNodes: JSON.parse(JSON.stringify(entry.nodes)),
      graphEdges: JSON.parse(JSON.stringify(entry.edges)),
      historyHead: newHead,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyHead >= state.graphHistory.length - 1) return;
    const newHead = state.historyHead + 1;
    const entry = state.graphHistory[newHead];
    set({
      graphNodes: JSON.parse(JSON.stringify(entry.nodes)),
      graphEdges: JSON.parse(JSON.stringify(entry.edges)),
      historyHead: newHead,
    });
  },

  canUndo: () => get().historyHead > 0,
  canRedo: () => get().historyHead < get().graphHistory.length - 1,
}));
