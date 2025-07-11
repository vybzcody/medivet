// src/medivet_frontend/src/hooks/useAccessControl.ts
import { useState, useCallback } from 'react';
import { medivet_backend } from '../../../declarations/medivet_backend';
import useAuthStore from '../stores/useAuthStore';
import useHealthRecordStore from '../stores/useHealthRecordStore';
import { AccessLog } from '../types';

/**
 * Custom hook for managing access control and audit logs for health records
 */
export function useAccessControl() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const { principal } = useAuthStore();

  /**
   * Grant access to a health record for another user
   * @param recordId The ID of the health record
   * @param userPrincipal The principal ID of the user to grant access to
   */
  const grantAccess = useCallback(async (recordId: number, userPrincipal: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      await medivet_backend.grant_access(BigInt(recordId), userPrincipal);
      setIsLoading(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to grant access';
      console.error('Access control error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  /**
   * Revoke access to a health record for another user
   * @param recordId The ID of the health record
   * @param userPrincipal The principal ID of the user to revoke access from
   */
  const revokeAccess = useCallback(async (recordId: number, userPrincipal: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      await medivet_backend.revoke_access(BigInt(recordId), userPrincipal);
      setIsLoading(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to revoke access';
      console.error('Access control error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  /**
   * Get access logs for a specific health record
   * @param recordId The ID of the health record
   */
  const getAccessLogs = useCallback(async (recordId: number): Promise<AccessLog[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      const logs = await medivet_backend.get_record_access_logs(BigInt(recordId));
      const typedLogs = logs as unknown as AccessLog[];
      setAccessLogs(typedLogs);
      setIsLoading(false);
      return typedLogs;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch access logs';
      console.error('Access logs error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  /**
   * Check if the current user has access to a health record
   * @param recordId The ID of the health record
   */
  const checkAccess = useCallback(async (recordId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      // First check if the user is the owner of the record
      const records = await medivet_backend.get_health_records();
      const isOwner = records.some((record: any) => 
        Number(record.id) === recordId && 
        record.owner === principal
      );
      
      if (isOwner) {
        setIsLoading(false);
        return true;
      }
      
      // Then check if the record is shared with the user
      const sharedRecords = await medivet_backend.get_shared_health_records();
      const hasAccess = sharedRecords.some((record: any) => 
        Number(record.id) === recordId
      );
      
      setIsLoading(false);
      return hasAccess;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check access';
      console.error('Access check error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  return {
    grantAccess,
    revokeAccess,
    getAccessLogs,
    checkAccess,
    accessLogs,
    isLoading,
    error
  };
}

export default useAccessControl;
