import { apiClient } from './client';

export const healthApi = {
  checkHealth: async (): Promise<boolean> => {
    try {
      // Temporarily bypass the /api/v1 prefix just for health if the backend registers it at the root.
      // Assuming GET /health is on the root level based on main.py
      const { data } = await apiClient.get('http://localhost:8000/health');
      return data.status === 'ok';
    } catch {
      return false;
    }
  },
};
