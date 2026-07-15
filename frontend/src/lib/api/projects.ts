import { apiClient } from './client';
import { Project } from '@/types/project';
import { ArchitectureGraph } from '@/types/graph';
import { RecommendationResponse } from '@/types/recommendation';

export const projectsApi = {
  listProjects: async (): Promise<Project[]> => {
    const { data } = await apiClient.get('/projects/');
    return data;
  },

  createProject: async (name: string): Promise<Project> => {
    const { data } = await apiClient.post('/projects/', { name });
    return data;
  },

  getProject: async (id: string): Promise<Project> => {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },

  getStatus: async (id: string): Promise<{ status: string }> => {
    const { data } = await apiClient.get(`/projects/${id}/status`);
    return data;
  },

  getRequirements: async (id: string): Promise<{ extracted: Record<string, any>; missing_fields: string[]; is_complete: boolean }> => {
    const { data } = await apiClient.get(`/projects/${id}/requirements`);
    return data;
  },

  getGraph: async (id: string): Promise<ArchitectureGraph> => {
    const { data } = await apiClient.get(`/projects/${id}/graph`);
    return data;
  },

  getRecommendations: async (id: string): Promise<RecommendationResponse> => {
    const { data } = await apiClient.get(`/projects/${id}/recommendations`);
    return data;
  },
};
