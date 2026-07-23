import axios from 'axios';
import { getBackendRoot } from './client';

export const healthApi = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const { data } = await axios.get(`${getBackendRoot()}/health`);
      return data.status === 'ok';
    } catch {
      return false;
    }
  },
};
