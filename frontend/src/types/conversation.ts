export interface ConversationMessage {
  project_id: string;
  message: string;
}

export interface NotebookField {
  label: string;
  value: string;
  confidence: number;
}

export interface NotebookRemaining {
  field: string;
  label: string;
}

export interface NotebookAssumption {
  field: string;
  value: string;
  confidence: number;
}

export interface NotebookData {
  detected: Record<string, NotebookField>;
  remaining: NotebookRemaining[];
  assumptions: NotebookAssumption[];
  confidence: number;
  stage: string;
  is_complete: boolean;
}

export interface ConversationResponse {
  extracted: Record<string, any>;
  missing_fields: string[];
  completed_fields: string[];
  next_question: string | null;
  is_complete: boolean;
  planner_goal?: string | null;
  confidence?: number;
  builder_message?: string;
  notebook?: NotebookData;
  response_type?: string;
}