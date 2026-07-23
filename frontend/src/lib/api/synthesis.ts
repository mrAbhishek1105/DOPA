import { apiClient } from './client';

export interface ArchitectureComponent {
  id: string;
  name: string;
  layer: string;
  required: boolean;
  reason: string;
  dependencies: string[];
}

export interface ArchitectureService {
  logical_component_id: string;
  cloud_service_id: string;
  cloud_service_name: string;
  cloud_provider: string;
  properties: Record<string, any>;
}

export interface ArchitectureScore {
  availability: number;
  cost: number;
  security: number;
  operations: number;
  performance: number;
  overall: number;
}

export interface ArchitectureOption {
  id: string;
  name: string;
  pattern: string;
  components: ArchitectureComponent[];
  services: ArchitectureService[];
  score: ArchitectureScore | null;
  reason: string;
}

export interface ArchitectureOptionsResponse {
  architecture_options: ArchitectureOption[];
}

export const synthesisApi = {
  generate: async (projectId: string, cloudProvider: string = "aws"): Promise<ArchitectureOptionsResponse> => {
    const { data } = await apiClient.post('/synthesis/generate', {
      project_id: projectId,
      cloud_provider: cloudProvider,
    });
    return data;
  },

  getSynthesis: async (projectId: string): Promise<ArchitectureOptionsResponse> => {
    const { data } = await apiClient.get(`/synthesis/${projectId}`);
    return data;
  },
};