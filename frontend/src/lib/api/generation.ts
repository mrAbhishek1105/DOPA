import { apiClient } from './client';

export const generationApi = {
  generateArchitecture: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.post('/generate/', { project_id: projectId });
    return data;
  },
};
