import { get, set } from 'idb-keyval';
import * as vetkd from "@dfinity/vetkeys";
import { Principal } from '@dfinity/principal';
import { createAuthenticatedActor } from './actorService';
import useAuthStore from '../stores/useAuthStore';

export class CryptoService {
  /**
   * Encrypts data with the user-specific secretKey (pure identity-based encryption)
   * @param owner The principal ID of the record owner
   * @param data The data to encrypt
   * @returns Promise with the encrypted data as a string
   */
  public static async encryptWithUserKey(owner: string, data: string): Promise<string> {
    if (!data) {
      throw new Error('Cannot encrypt empty data');
    }
    
    await this.fetch_user_key_if_needed(owner);
    const user_key = await get(['user_key', owner]);
    
    if (!user_key) {
      throw new Error('Failed to retrieve encryption key for user');
    }
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    console.log('Encrypting data for user:', owner, 'data length:', data.length);
    
    try {
      const data_encoded = new TextEncoder().encode(data);
      const encrypted_data_encoded = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        user_key,
        data_encoded
      );
      
      // Create a combined array with IV + ciphertext (following VetKeys pattern)
      const encrypted_array = new Uint8Array(iv.length + new Uint8Array(encrypted_data_encoded).length);
      encrypted_array.set(iv, 0);
      encrypted_array.set(new Uint8Array(encrypted_data_encoded), iv.length);
      
      // Convert to Base64 for safe storage and transport
      const result = CryptoService.arrayBufferToBase64(encrypted_array);
      console.log('Encrypted result length:', result.length);
      return result;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts the given input data with the user-specific secretKey (identity-based)
   * @param owner The principal ID of the record owner
   * @param data The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  public static async decryptWithUserKey(owner: string, data: string): Promise<string> {
    if (!data) {
      console.warn('Empty data provided for decryption');
      return '';
    }
    
    try {
      await this.fetch_user_key_if_needed(owner);
      const user_key = await get(['user_key', owner]);
      if (!user_key) {
        throw new Error('Failed to retrieve encryption key for user');
      }
      
      console.log('Decrypting data for user:', owner, 'data length:', data.length);
      
      // Convert Base64 string to array buffer with validation
      const encrypted_array = CryptoService.base64ToArrayBuffer(data);
      
      // Validate minimum length (IV + some ciphertext)
      if (encrypted_array.length < 13) {
        throw new Error('Encrypted data is too short to contain valid IV and ciphertext');
      }
      
      // Extract IV (first 12 bytes) and ciphertext
      const iv = encrypted_array.slice(0, 12);
      const ciphertext = encrypted_array.slice(12);
      
      const decrypted_data_encoded = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        user_key,
        ciphertext
      );
      
      return new TextDecoder().decode(decrypted_data_encoded);
    } catch (error) {
      console.error('Decryption failed for user:', owner, 'Error:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy method name for backward compatibility - delegates to identity-based encryption
   * @param record_id The ID of the health record (ignored - for backward compatibility only)
   * @param owner The principal ID of the record owner
   * @param data The data to encrypt
   * @returns Promise with the encrypted data as a string
   */
  public static async encryptWithRecordKey(record_id: bigint, owner: string, data: string): Promise<string> {
    console.log('Using legacy encryptWithRecordKey - delegating to identity-based encryption');
    return this.encryptWithUserKey(owner, data);
  }

  /**
   * Enhanced method for cross-user decryption - allows providers to decrypt patient records
   * @param record_id The ID of the health record
   * @param owner The principal ID of the record owner
   * @param data The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  public static async decryptWithRecordKey(record_id: bigint, owner: string, data: string): Promise<string> {
    const { principal } = useAuthStore.getState();
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    const callerPrincipalStr = principal.toString();
    
    // If caller is the owner, use identity-based decryption
    if (callerPrincipalStr === owner) {
      console.log('Using identity-based decryption (owner access)');
      return this.decryptWithUserKey(owner, data);
    }
    
    // If caller is not the owner, use cross-user decryption for shared records
    console.log('Using cross-user decryption for shared record', record_id, 'owned by', owner);
    return this.decryptSharedRecord(record_id, owner, data);
  }
  
  /**
   * Decrypts a shared record that the current user has permissions for
   * @param record_id The ID of the health record
   * @param owner The principal ID of the record owner
   * @param data The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  public static async decryptSharedRecord(record_id: bigint, owner: string, data: string): Promise<string> {
    if (!data) {
      console.warn('Empty data provided for shared record decryption');
      return '';
    }
    
    try {
      await this.fetch_shared_record_key_if_needed(record_id, owner);
      const shared_key = await get(['shared_record_key', owner, record_id.toString()]);
      if (!shared_key) {
        throw new Error('Failed to retrieve shared record encryption key');
      }
      
      console.log('Decrypting shared record data for owner:', owner, 'record:', record_id, 'data length:', data.length);
      
      // Convert Base64 string to array buffer with validation
      const encrypted_array = CryptoService.base64ToArrayBuffer(data);
      
      // Validate minimum length (IV + some ciphertext)
      if (encrypted_array.length < 13) {
        throw new Error('Encrypted data is too short to contain valid IV and ciphertext');
      }
      
      // Extract IV (first 12 bytes) and ciphertext
      const iv = encrypted_array.slice(0, 12);
      const ciphertext = encrypted_array.slice(12);
      
      const decrypted_data_encoded = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        shared_key,
        ciphertext
      );
      
      return new TextDecoder().decode(decrypted_data_encoded);
    } catch (error) {
      console.error('Shared record decryption failed for owner:', owner, 'record:', record_id, 'Error:', error);
      throw new Error(`Shared record decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Fetches the shared record encryption key if not already cached
   * @param record_id The ID of the health record
   * @param owner The principal ID of the record owner
   */
  private static async fetch_shared_record_key_if_needed(record_id: bigint, owner: string): Promise<void> {
    const cacheKey = ['shared_record_key', owner, record_id.toString()];
    
    // Check if we already have the shared key cached
    const cachedKey = await get(cacheKey);
    if (cachedKey) {
      console.log('Using cached shared record encryption key for:', owner, record_id);
      return;
    }
    
    console.log('Fetching shared record encryption key for:', owner, record_id);
    const tsk = vetkd.TransportSecretKey.random();

    try {
      // Get authenticated actor
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }
      const { actor } = await createAuthenticatedActor(identity);
      
      // Convert owner string to Principal properly
      const ownerPrincipal = Principal.fromText(owner);
      
      // Fetch encrypted key from backend for shared record
      console.log('Requesting encrypted shared record key for record:', record_id, 'owner:', owner);
      const result = await actor.encrypted_symmetric_key_for_shared_record(
        record_id,
        ownerPrincipal,
        tsk.publicKeyBytes()
      );
      
      if ('err' in result) {
        // Provide more specific error messages
        if (result.err.includes('not shared') || result.err.includes('permission')) {
          throw new Error(`Access denied: You don't have permission to access this record`);
        }
        throw new Error(`Backend error: ${result.err}`);
      }
      
      const ek_bytes_hex = result.ok;
      if (!ek_bytes_hex) {
        throw new Error('Received empty encrypted key from backend');
      }
      console.log('Received encrypted shared record key, hex length:', ek_bytes_hex.length);
      
      // Deserialize the encrypted key
      let encryptedVetKey;
      try {
        const decoded = CryptoService.hex_decode(ek_bytes_hex);
        console.log('Decoded hex to bytes, length:', decoded.length);
        encryptedVetKey = vetkd.EncryptedVetKey.deserialize(decoded);
        console.log('Successfully deserialized encrypted shared record key');
      } catch (deserializeError) {
        console.error('Failed to deserialize encrypted shared record key:', deserializeError);
        console.error('Hex string was:', ek_bytes_hex.substring(0, 100) + '...');
        throw new Error(`Invalid encrypted key format: ${deserializeError instanceof Error ? deserializeError.message : 'Unknown error'}`);
      }
      
      // Fetch verification key
      console.log('Requesting verification key for shared record');
      const pk_bytes_hex = await actor.symmetric_key_verification_key_for_user();
      if (!pk_bytes_hex) {
        throw new Error('Received empty verification key from backend');
      }
      
      // Deserialize the verification key
      let dpk;
      try {
        const decoded = CryptoService.hex_decode(pk_bytes_hex);
        dpk = vetkd.DerivedPublicKey.deserialize(decoded);
        console.log('Successfully deserialized verification key for shared record');
      } catch (deserializeError) {
        console.error('Failed to deserialize verification key:', deserializeError);
        throw new Error(`Invalid verification key format: ${deserializeError instanceof Error ? deserializeError.message : 'Unknown error'}`);
      }

      // Use provider's identity to derive shared key (following VetKeys pattern)
      const callerPrincipal = identity?.getPrincipal();
      if (!callerPrincipal) {
        throw new Error('Could not get caller principal for shared key derivation');
      }
      
      console.log('Deriving shared record key for caller:', callerPrincipal.toString());
      const callerBytes = callerPrincipal.toUint8Array();
      
      try {
        const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, callerBytes);
        const keyMaterial = await vetKey.asDerivedKeyMaterial();
        const shared_key = await keyMaterial.deriveAesGcmCryptoKey("shared-record-key");
        
        // Cache the shared key
        await set(cacheKey, shared_key);
        console.log('Successfully derived and cached shared record encryption key');
        return;
      } catch (keyDerivationError) {
        console.error('Key derivation failed:', keyDerivationError);
        throw new Error(`Key derivation failed: ${keyDerivationError instanceof Error ? keyDerivationError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching shared record encryption key for:', owner, record_id, 'Error:', error);
      throw error;
    }
  }

  /**
   * Fetches the encryption key for a user if it's not already cached (pure identity-based)
   * @param owner The principal ID of the record owner
   */
  private static async fetch_user_key_if_needed(owner: string): Promise<void> {
    // Check if we already have the user key cached
    const cachedKey = await get(['user_key', owner]);
    if (cachedKey) {
      console.log('Using cached encryption key for user:', owner);
      return;
    }
    
    console.log('Fetching encryption key for user:', owner);
    const tsk = vetkd.TransportSecretKey.random();

    try {
      // Get authenticated actor
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }
      const { actor } = await createAuthenticatedActor(identity);
      
      // Fetch encrypted key from backend (no record ID needed - pure identity-based)
      console.log('Requesting encrypted key for user:', owner);
      const ek_bytes_hex = await actor.encrypted_symmetric_key_for_user(tsk.publicKeyBytes());
      if (!ek_bytes_hex) {
        throw new Error('Received empty encrypted key from backend');
      }
      console.log('Received encrypted key, length:', ek_bytes_hex.length);
      
      // Deserialize the encrypted key
      let encryptedVetKey;
      try {
        const decoded = CryptoService.hex_decode(ek_bytes_hex);
        encryptedVetKey = vetkd.EncryptedVetKey.deserialize(decoded);
        console.log('Successfully deserialized encrypted key');
      } catch (deserializeError) {
        console.error('Failed to deserialize encrypted key:', deserializeError);
        throw new Error('Invalid encrypted key format');
      }
      
      // Fetch verification key
      console.log('Requesting verification key');
      const pk_bytes_hex = await actor.symmetric_key_verification_key_for_user();
      if (!pk_bytes_hex) {
        throw new Error('Received empty verification key from backend');
      }
      
      // Deserialize the verification key
      let dpk;
      try {
        const decoded = CryptoService.hex_decode(pk_bytes_hex);
        dpk = vetkd.DerivedPublicKey.deserialize(decoded);
        console.log('Successfully deserialized verification key');
      } catch (deserializeError) {
        console.error('Failed to deserialize verification key:', deserializeError);
        throw new Error('Invalid verification key format');
      }

      // Use user's identity to derive key (pure identity-based)
      const callerPrincipal = identity?.getPrincipal();
      if (!callerPrincipal) {
        throw new Error('Could not get caller principal for key derivation');
      }
      
      console.log('Using identity-based key derivation (pure vetKeys pattern)');
      const callerBytes = callerPrincipal.toUint8Array();
      const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, callerBytes);
      const user_key = await (await vetKey.asDerivedKeyMaterial()).deriveAesGcmCryptoKey("user-key");
      
      // Cache the user key
      await set(['user_key', owner], user_key);
      console.log('Successfully derived identity-based encryption key');
      return;
    } catch (error) {
      console.error('Error fetching encryption key for user:', owner, 'Error:', error);
      throw error;
    }
  }

  /**
   * Decodes a hex string to a Uint8Array
   * @param hexString Hex string to decode
   * @returns Uint8Array representation of the hex string
   */
  private static hex_decode(hexString: string): Uint8Array {
    return Uint8Array.from((hexString.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));
  }

  /**
   * Encodes a Uint8Array to a hex string
   * @param bytes Uint8Array to encode
   * @returns Hex string representation of the Uint8Array
   */
  private static hex_encode(bytes: Uint8Array): string {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  }
  
  /**
   * Converts a string to a Uint8Array for encryption
   * @param data String data to convert
   * @returns Uint8Array representation of the string
   */
  public static stringToUint8Array(data: string): Uint8Array {
    return new TextEncoder().encode(data);
  }

  /**
   * Converts a Uint8Array to a string after decryption
   * @param data Uint8Array to convert
   * @returns String representation of the Uint8Array
   */
  public static uint8ArrayToString(data: Uint8Array): string {
    return new TextDecoder().decode(data);
  }

  /**
   * Converts an ArrayBuffer or Uint8Array to a Base64 string
   * @param buffer The ArrayBuffer or Uint8Array to convert
   * @returns Base64 string
   */
  public static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts a Base64 string to an ArrayBuffer
   * @param base64 The Base64 string to convert
   * @returns ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    // Validate input
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid input: base64 string is required');
    }
    
    // Trim whitespace and check if string is valid base64
    const trimmed = base64.trim();
    if (!this.isBase64(trimmed)) {
      console.error('Invalid base64 string detected:', trimmed.substring(0, 50) + '...');
      throw new Error('Invalid base64 string: contains invalid characters');
    }
    
    try {
      const binary_string = atob(trimmed);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('Base64 decoding failed:', error);
      throw new Error(`Failed to decode base64 string: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Checks if a string is Base64 encoded
   * @param str The string to check
   * @returns boolean indicating if the string is Base64 encoded
   */
  private static isBase64(str: string): boolean {
    if (str === '' || str.trim() === '') return false;
    try {
      // Check if the string matches the Base64 pattern
      // Base64 strings should only contain A-Z, a-z, 0-9, +, /, and = (for padding)
      return /^[A-Za-z0-9+/=]+$/.test(str) && atob(str) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Clears all cached encryption keys (useful for testing or key rotation)
   */
  public static async clearAllCachedKeys(): Promise<void> {
    try {
      // Clear all user keys and shared record keys from IndexedDB
      const allKeys = await this.getAllCachedKeyNames();
      for (const key of allKeys) {
        await set(key, undefined);
      }
      console.log('Cleared all cached encryption keys');
    } catch (error) {
      console.error('Error clearing cached keys:', error);
      throw new Error('Failed to clear cached keys');
    }
  }

  /**
   * Gets a list of all cached key names for debugging purposes
   */
  private static async getAllCachedKeyNames(): Promise<Array<string[]>> {
    // This is a simplified approach - in a real implementation, 
    // you might want to maintain a registry of keys
    return [
      // Common patterns - this is not exhaustive but covers main cases
      ['user_key'], // Will need specific principal IDs
      ['shared_record_key'] // Will need owner and record_id
    ];
  }

  /**
   * Validates encrypted data format before attempting decryption
   * @param data The encrypted data to validate
   * @returns boolean indicating if data appears to be valid encrypted format
   */
  public static validateEncryptedDataFormat(data: string): boolean {
    if (!data || typeof data !== 'string') {
      return false;
    }
    
    try {
      // Check if it's valid base64
      if (!this.isBase64(data.trim())) {
        return false;
      }
      
      // Check if decoded data has minimum length for IV + ciphertext
      const decoded = this.base64ToArrayBuffer(data.trim());
      return decoded.length >= 13; // 12 bytes IV + at least 1 byte ciphertext
    } catch (e) {
      return false;
    }
  }
}
