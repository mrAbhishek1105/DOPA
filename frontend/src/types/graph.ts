export interface GraphNodeData {
  label: string;
  service?: string;
  icon?: string;
  category?: string;
  [key: string]: any;
}

export interface GraphNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
