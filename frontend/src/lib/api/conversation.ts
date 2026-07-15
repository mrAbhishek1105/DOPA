import { apiClient } from './client';
import { ConversationMessage, ConversationResponse } from '@/types/conversation';

export const conversationApi = {
  sendMessage: async (payload: ConversationMessage): Promise<ConversationResponse> => {
    const { data } = await apiClient.post('/conversation/message', payload);
    return data;
  },
};
