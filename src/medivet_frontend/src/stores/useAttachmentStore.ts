import { create } from 'zustand';
import useAuthStore from './useAuthStore';
import { createAuthenticatedActor } from '../services/actorService';

interface AttachmentState {
  currentAttachment: Uint8Array | null;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  uploadAttachment: (content: Uint8Array) => Promise<number>;
  getAttachment: (id: number) => Promise<Uint8Array | null>;
}

const useAttachmentStore = create<AttachmentState>((set, get) => ({
  currentAttachment: null,
  isLoading: false,
  error: null,
  
  uploadAttachment: async (content: Uint8Array): Promise<number> => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      const attachmentId = await actor.upload_attachment(content);
      set({ isLoading: false });
      return attachmentId as unknown as number;
    } catch (error: any) {
      console.error("Error uploading attachment:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  getAttachment: async (id: number): Promise<Uint8Array | null> => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      const attachment = await actor.get_attachment(BigInt(id));
      const result = attachment[0] ? new Uint8Array(attachment[0] as unknown as ArrayBuffer) : null;
      set({ currentAttachment: result, isLoading: false });
      return result;
    } catch (error: any) {
      console.error("Error fetching attachment:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));

export default useAttachmentStore;
