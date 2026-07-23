import { apiClient } from './client';

export const generationApi = {
  generateRecommendations: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/recommendations/generate', { project_id: projectId });
    return data;
  },
  generateGraph: async (projectId: string, selectedOptionId: string): Promise<any> => {
    const { data } = await apiClient.post('/graph/generate', { 
      project_id: projectId,
      selected_option_id: selectedOptionId
    });
    return data;
  },
  generateTerraform: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/terraform/generate', { project_id: projectId });
    return data;
  },
  analyzeSecurity: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/security/analyze', { project_id: projectId });
    return data;
  },
  analyzeCost: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/cost/analyze', { project_id: projectId });
    return data;
  },
  checkValidation: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/validation/check', { project_id: projectId });
    return data;
  },
  generateExplanation: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/explanation/generate', { project_id: projectId });
    return data;
  },
  generateReports: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/reports/generate', { project_id: projectId });
    return data;
  },
  getTerraform: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/terraform/${projectId}`);
    return data;
  },
  getSecurity: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/security/${projectId}`);
    return data;
  },
  getCost: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/cost/${projectId}`);
    return data;
  },
  getValidation: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/validation/${projectId}`);
    return data;
  },
  getExplanation: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/explanation/${projectId}`);
    return data;
  },
  getReports: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.get(`/reports/${projectId}`);
    return data;
  },
};
