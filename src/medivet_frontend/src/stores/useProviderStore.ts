import { create } from 'zustand';
import { HealthRecord, AccessLog } from '../types';
import useAuthStore from './useAuthStore';
import { createAuthenticatedActor } from '../services/actorService';

interface ProviderState {
  accessLogs: AccessLog[];
  monetizableRecords: HealthRecord[];
  isLoading: boolean;
  error: string | null;
  lastAccessLogsFetch: number | null;
  lastMonetizableRecordsFetch: number | null;
  
  // Methods
  fetchAccessLogs: () => Promise<void>;
  fetchMonetizableRecords: () => Promise<void>;
  queryRecord: (recordId: number) => Promise<HealthRecord>;
}

const useProviderStore = create<ProviderState>((set, get) => ({
  accessLogs: [],
  monetizableRecords: [],
  isLoading: false,
  error: null,
  lastAccessLogsFetch: null,
  lastMonetizableRecordsFetch: null,
  
  fetchAccessLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getAccessLogs();
      
      if ('ok' in result) {
        // Transform backend logs to frontend format
        const transformedLogs = result.ok.map((log: any) => ({
          id: Number(log.id),
          record_id: Number(log.recordId),
          provider_principal: log.provider.toString(),
          access_time: Number(log.ts),
          paid_amount: Number(log.paidMT),
          action: 'Accessed'
        }));
        
        set({ 
          accessLogs: transformedLogs, 
          isLoading: false, 
          lastAccessLogsFetch: Date.now() 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch access logs');
      }
    } catch (error: any) {
      console.error("Error fetching provider access logs:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchMonetizableRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getMonetizableRecords();
      
      if ('ok' in result) {
        // Transform backend records to frontend format
        const transformedRecords = result.ok.map((record: any) => ({
          id: Number(record.id),
          title: record.title,
          category: record.category,
          provider: 'Unknown', // Backend doesn't store provider field
          record_type: record.category,
          record_date: Number(record.createdAt),
          encrypted_content: new Uint8Array(record.encryptedBlob),
          attachment_id: record.attachment ? Number(record.attachment) : null,
          user_permissions: [],
          access_count: Number(record.accessCount),
          created_at: Number(record.createdAt),
          updated_at: Number(record.modifiedAt),
          owner: record.owner.toString()
        }));
        
        set({ 
          monetizableRecords: transformedRecords, 
          isLoading: false, 
          lastMonetizableRecordsFetch: Date.now() 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch monetizable records');
      }
    } catch (error: any) {
      console.error("Error fetching monetizable records:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  queryRecord: async (recordId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.queryRecord(BigInt(recordId));
      
      if ('ok' in result) {
        const record = result.ok;
        
        // Transform backend record to frontend format
        const transformedRecord = {
          id: Number(record.id),
          title: record.title,
          category: record.category,
          provider: 'Unknown',
          record_type: record.category,
          record_date: Number(record.createdAt),
          encrypted_content: new Uint8Array(record.encryptedBlob),
          attachment_id: record.attachment ? Number(record.attachment) : null,
          user_permissions: [],
          access_count: Number(record.accessCount),
          created_at: Number(record.createdAt),
          updated_at: Number(record.modifiedAt),
          owner: record.owner.toString()
        };
        
        // Refresh access logs and monetizable records after querying
        await get().fetchAccessLogs();
        await get().fetchMonetizableRecords();
        
        set({ isLoading: false });
        return transformedRecord;
      } else {
        throw new Error(result.err || 'Failed to query record');
      }
    } catch (error: any) {
      console.error("Error querying record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));

export default useProviderStore;
