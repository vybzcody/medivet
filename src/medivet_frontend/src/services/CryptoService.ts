import { get, set } from 'idb-keyval';
import * as vetkd from "@dfinity/vetkeys";
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
    await this.fetch_user_key_if_needed(owner);
    const user_key = await get(['user_key', owner]);
    
    if (!user_key) {
      throw new Error('Failed to retrieve encryption key for user');
    }
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    console.log('Encrypting data for user:', owner, 'data length:', data.length);
    
    const data_encoded = new TextEncoder().encode(data);
    let encrypted_data_encoded = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      user_key,
      data_encoded
    );
    
    // Create a combined array with IV + ciphertext
    const encrypted_array = new Uint8Array(iv.length + new Uint8Array(encrypted_data_encoded).length);
    encrypted_array.set(iv, 0);
    encrypted_array.set(new Uint8Array(encrypted_data_encoded), iv.length);
    
    // Convert to Base64 for safe storage
    const result = CryptoService.arrayBufferToBase64(encrypted_array);
    console.log('Encrypted result length:', result.length);
    return result;
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
    
    await this.fetch_user_key_if_needed(owner);
    const user_key = await get(['user_key', owner]);
    if (!user_key) {
      throw new Error('Failed to retrieve encryption key for user');
    }
    
    console.log('Decrypting data for user:', owner, 'data length:', data.length);
    
    // Convert Base64 string to array buffer
    const encrypted_array = CryptoService.base64ToArrayBuffer(data);
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = encrypted_array.slice(0, 12);
    const ciphertext = encrypted_array.slice(12);
    
    const decrypted_data_encoded = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      user_key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted_data_encoded);
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
   * Legacy method name for backward compatibility - delegates to identity-based decryption
   * @param record_id The ID of the health record (ignored - for backward compatibility only)
   * @param owner The principal ID of the record owner
   * @param data The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  public static async decryptWithRecordKey(record_id: bigint, owner: string, data: string): Promise<string> {
    console.log('Using legacy decryptWithRecordKey - delegating to identity-based decryption');
    return this.decryptWithUserKey(owner, data);
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
      const actor = await createAuthenticatedActor(identity);
      
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
   * Converts an ArrayBuffer or Uint8Array to a Base64 string
   * @param buffer The ArrayBuffer or Uint8Array to convert
   * @returns Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
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
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
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
}
