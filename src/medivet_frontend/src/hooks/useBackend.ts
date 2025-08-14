import { useState, useCallback } from 'react';
import { medivet_backend } from '../../../declarations/medivet_backend';
import { Principal } from '@dfinity/principal';

/**
 * Custom hook for handling backend interactions with error handling and loading states
 */
export function useBackend() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generic wrapper for backend calls to handle loading state and errors
   * @param apiCall - Function that makes the actual backend call
   * @returns Promise with the result of the backend call
   */
  const callBackend = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred';
      console.error('Backend call failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get the current user's principal ID
   * Note: This method is not available in the current backend implementation
   * @returns The principal ID as a string
   */
  const whoami = useCallback(async (): Promise<string> => {
    // TODO: Implement when backend method is available
    console.warn('whoami method not yet implemented in backend');
    return 'placeholder-principal';
  }, [callBackend]);

  return {
    isLoading,
    error,
    callBackend,
    whoami,
    // Direct access to the backend canister
    backend: medivet_backend
  };
}

export default useBackend;
