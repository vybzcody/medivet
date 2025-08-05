import { useState, useCallback } from 'react';
import { CryptoService } from '../services/CryptoService';
import useAuthStore from '../stores/useAuthStore';

/**
 * Custom hook for handling encryption and decryption of health records
 */
export function useCrypto() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { principal } = useAuthStore();

  /**
   * Encrypts data for a specific health record
   * @param recordId The ID of the health record
   * @param data The data to encrypt
   * @returns Promise with the encrypted data as a string
   */
  const encryptData = useCallback(async (recordId: number, data: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      const result = await CryptoService.encryptWithRecordKey(
        BigInt(recordId), 
        principal, 
        data
      );
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Encryption failed';
      console.error('Encryption error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  /**
   * Decrypts data from a specific health record
   * @param recordId The ID of the health record
   * @param encryptedData The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  const decryptData = useCallback(async (recordId: number, encryptedData: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      const result = await CryptoService.decryptWithRecordKey(
        BigInt(recordId), 
        principal, 
        encryptedData
      );
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Decryption failed';
      console.error('Decryption error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [principal]);

  /**
   * Encrypts data for a health record with a different owner (for sharing)
   * @param recordId The ID of the health record
   * @param ownerPrincipal The principal ID of the record owner
   * @param data The data to encrypt
   * @returns Promise with the encrypted data as a string
   */
  const encryptDataForSharing = useCallback(async (
    recordId: number, 
    ownerPrincipal: string, 
    data: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await CryptoService.encryptWithRecordKey(
        BigInt(recordId), 
        ownerPrincipal, 
        data
      );
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Encryption for sharing failed';
      console.error('Encryption error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Converts a string to a Uint8Array for sending to the backend
   */
  const stringToUint8Array = useCallback((data: string): Uint8Array => {
    return CryptoService.stringToUint8Array(data);
  }, []);

  /**
   * Converts a Uint8Array from the backend to a string
   */
  const uint8ArrayToString = useCallback((data: Uint8Array): string => {
    return CryptoService.uint8ArrayToString(data);
  }, []);

  return {
    encryptData,
    decryptData,
    encryptDataForSharing,
    stringToUint8Array,
    uint8ArrayToString,
    isLoading,
    error
  };
}

export default useCrypto;
