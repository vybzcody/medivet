// src/medivet_frontend/src/services/CryptoService.ts
import { get, set } from 'idb-keyval';
import * as vetkd from "@dfinity/vetkeys";
import { createAuthenticatedActor } from './actorService';
import useAuthStore from '../stores/useAuthStore';

export class CryptoService {
  /**
   * Encrypts data with the health record-specific secretKey
   * @param record_id The ID of the health record
   * @param owner The principal ID of the record owner
   * @param data The data to encrypt
   * @returns Promise with the encrypted data as a string
   */
  public static async encryptWithRecordKey(record_id: bigint, owner: string, data: string): Promise<string> {
    await this.fetch_record_key_if_needed(record_id, owner);
    const record_key = await get([record_id.toString(), owner]);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    console.log('Encrypting record:', record_id.toString(), 'data length:', data.length);
    console.log('IV bytes:', iv);
    
    const data_encoded = new TextEncoder().encode(data);
    let encrypted_data_encoded = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      record_key,
      data_encoded
    );
    
    // Create a combined array with IV + ciphertext
    const encrypted_array = new Uint8Array(iv.length + new Uint8Array(encrypted_data_encoded).length);
    encrypted_array.set(iv, 0);
    encrypted_array.set(new Uint8Array(encrypted_data_encoded), iv.length);
    
    // Convert to Base64 for safe storage
    const result = CryptoService.arrayBufferToBase64(encrypted_array);
    console.log('Encrypted result length:', result.length, 'first 50 chars:', result.substring(0, 50));
    return result;
  }

  /**
   * Decrypts the given input data with the health record-specific secretKey
   * @param record_id The ID of the health record
   * @param owner The principal ID of the record owner
   * @param data The encrypted data to decrypt
   * @returns Promise with the decrypted data as a string
   */
  public static async decryptWithRecordKey(record_id: bigint, owner: string, data: string): Promise<string> {
    if (!data) {
      console.warn('Empty data provided for decryption');
      return '';
    }
    
    await this.fetch_record_key_if_needed(record_id, owner);
    const record_key = await get([record_id.toString(), owner]);
    if (!record_key) {
      throw new Error('Failed to retrieve encryption key for record');
    }
    
    console.log('Decrypting record:', record_id.toString(), 'data length:', data.length);
    console.log('Data format check:', {
      isBase64: CryptoService.isBase64(data),
      firstChars: data.substring(0, 20),
      containsNonPrintable: /[\x00-\x1F\x80-\xFF]/.test(data.substring(0, 100))
    });
    
    // We'll try multiple decryption methods in sequence
    const decryptionMethods = [
      // Method 1: Base64 format (new format)
      async () => {
        console.log('Trying decryption method 1: Base64 format');
        // Convert Base64 string to array buffer
        const encrypted_array = CryptoService.base64ToArrayBuffer(data);
        
        // Extract IV (first 12 bytes) and ciphertext
        const iv = encrypted_array.slice(0, 12);
        const ciphertext = encrypted_array.slice(12);
        
        console.log('Base64 decode - IV length:', iv.length, 'Cipher length:', ciphertext.length);
        
        const decrypted_data_encoded = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          record_key,
          ciphertext
        );
        
        return new TextDecoder().decode(decrypted_data_encoded);
      },
      
      // Method 2: Legacy string format
      async () => {
        console.log('Trying decryption method 2: Legacy string format');
        const iv_decoded = data.slice(0, 12);
        const cipher_decoded = data.slice(12);
        
        if (iv_decoded.length !== 12) {
          throw new Error('Invalid IV length in legacy format');
        }
        
        console.log('Legacy format - IV length:', iv_decoded.length, 'Cipher length:', cipher_decoded.length);
        
        const iv_encoded = Uint8Array.from([...iv_decoded].map(ch => ch.charCodeAt(0))).buffer;
        const ciphertext_encoded = Uint8Array.from([...cipher_decoded].map(ch => ch.charCodeAt(0))).buffer;

        const decrypted_data_encoded = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv_encoded },
          record_key,
          ciphertext_encoded
        );
        
        return new TextDecoder().decode(decrypted_data_encoded);
      },
      
      // Method 3: Try with Base64 decode but different IV extraction
      async () => {
        console.log('Trying decryption method 3: Alternative Base64 format');
        // Some implementations might encode differently
        try {
          // Try to decode as Base64 first
          const decoded = atob(data);
          const bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
          
          // Extract IV (first 12 bytes) and ciphertext
          const iv = bytes.slice(0, 12);
          const ciphertext = bytes.slice(12);
          
          console.log('Alt Base64 - IV length:', iv.length, 'Cipher length:', ciphertext.length);
          
          const decrypted_data_encoded = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            record_key,
            ciphertext
          );
          
          return new TextDecoder().decode(decrypted_data_encoded);
        } catch (e) {
          throw new Error('Alternative Base64 decoding failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        }
      }
    ];
    
    // Try each method in sequence
    let lastError = null;
    for (let i = 0; i < decryptionMethods.length; i++) {
      try {
        const result = await decryptionMethods[i]();
        console.log(`Successfully decrypted using method ${i+1}`);
        return result;
      } catch (error) {
        console.log(`Decryption method ${i+1} failed:`, error);
        lastError = error;
      }
    }
    
    // If we get here, all methods failed
    console.error('All decryption methods failed. Last error:', lastError);
    throw new Error('Failed to decrypt data: ' + (lastError instanceof Error ? lastError.message : 'Unknown error'));
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
 * Fetches the encryption key for a health record if it's not already cached
 * @param record_id The ID of the health record
 * @param owner The principal ID of the record owner
 */
private static async fetch_record_key_if_needed(record_id: bigint, owner: string): Promise<void> {
  // Check if we already have the key cached
  const cachedKey = await get([record_id.toString(), owner]);
  if (cachedKey) {
    console.log('Using cached encryption key for record:', record_id.toString());
    return;
  }
  
  console.log('Fetching encryption key for record:', record_id.toString(), 'owner:', owner);
  const tsk = vetkd.TransportSecretKey.random();

  try {
    // Get authenticated actor
    const { identity } = useAuthStore.getState();
    if (!identity) {
      throw new Error('User not authenticated');
    }
    const actor = await createAuthenticatedActor(identity);
    
    // Fetch encrypted key from backend
    console.log('Requesting encrypted key for record:', record_id.toString());
    const ek_bytes_hex = await actor.encrypted_symmetric_key_for_health_record(Number(record_id), tsk.publicKeyBytes());
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
    const pk_bytes_hex = await actor.symmetric_key_verification_key_for_health_record();
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

    // Create the input for key derivation
    // We'll try multiple derivation methods to handle different record scenarios
    const record_id_bytes: Uint8Array = CryptoService.bigintTo128BitBigEndianUint8Array(record_id);
    const methods = [
      // Method 1: Just record ID (for shared records)
      async () => {
        console.log('Trying key derivation method 1: record ID only');
        const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, record_id_bytes);
        return await (await vetKey.asDerivedKeyMaterial()).deriveAesGcmCryptoKey("record-key");
      },
      
      // Method 2: Record ID + owner (original method)
      async () => {
        console.log('Trying key derivation method 2: record ID + owner');
        const owner_utf8: Uint8Array = new TextEncoder().encode(owner);
        let input = new Uint8Array(record_id_bytes.length + owner_utf8.length);
        input.set(record_id_bytes);
        input.set(owner_utf8, record_id_bytes.length);
        const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, input);
        return await (await vetKey.asDerivedKeyMaterial()).deriveAesGcmCryptoKey("record-key");
      },
      
      // Method 3: Just owner principal (alternative approach)
      async () => {
        console.log('Trying key derivation method 3: owner principal only');
        const owner_utf8: Uint8Array = new TextEncoder().encode(owner);
        const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, owner_utf8);
        return await (await vetKey.asDerivedKeyMaterial()).deriveAesGcmCryptoKey("record-key");
      }
    ];
    
    // Try each method in sequence
    let lastError = null;
    for (let i = 0; i < methods.length; i++) {
      try {
        const record_key = await methods[i]();
        await set([record_id.toString(), owner], record_key);
        console.log(`Successfully derived key using method ${i+1}`);
        return;
      } catch (error) {
        console.log(`Method ${i+1} failed:`, error);
        lastError = error;
      }
    }
    
    // If we get here, all methods failed
    console.error('All key derivation methods failed. Last error:', lastError);
    throw new Error('Failed to derive encryption key: ' + (lastError instanceof Error ? lastError.message : 'Unknown error'));
  } catch (error) {
    console.error('Error fetching encryption key for record:', record_id.toString(), 'Error:', error);
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
  
  /**
   * Converts a bigint to a 128-bit big-endian Uint8Array
   * @param bn Bigint to convert
   * @returns 128-bit big-endian Uint8Array representation of the bigint
   */
  private static bigintTo128BitBigEndianUint8Array(bn: bigint): Uint8Array {
    var hex = BigInt(bn).toString(16);

    // extend hex to length 32 = 16 bytes = 128 bits
    while (hex.length < 32) {
      hex = '0' + hex;
    }

    var len = hex.length / 2;
    var u8 = new Uint8Array(len);

    var i = 0;
    var j = 0;
    while (i < len) {
      u8[i] = parseInt(hex.slice(j, j + 2), 16);
      i += 1;
      j += 2;
    }

    return u8;
  }
}
