import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Derives the root backend URL from the API base (strips /api/v1 suffix).
 * Used for endpoints registered at the root level (e.g. /health).
 */
export function getBackendRoot(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}
