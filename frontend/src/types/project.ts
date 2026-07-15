export type ProjectStatus = 
  | "discovery"
  | "requirements_gathered"
  | "options_generated"
  | "graph_generated"
  | "analyzing"
  | "explaining"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}
