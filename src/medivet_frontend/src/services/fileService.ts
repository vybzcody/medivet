/**
 * File Management Service
 * 
 * Provides comprehensive file upload, download, sharing, and management functionality
 * for the MediVet platform. Handles chunked uploads, file metadata, permissions,
 * and profile photo management.
 */

import { Actor, Identity } from '@dfinity/agent';
import { idlFactory as vaultIdlFactory } from '../../../declarations/vault/vault.did.js';
import { createAuthenticatedActor } from './actorService';

// Types for file operations
export interface FileMetadata {
  name: string;
  size: number;
  fileType: string;
  createdAt: bigint;
  modifiedAt: bigint;
  isProfilePhoto: boolean;
  permissions: FilePermission[];
}

export interface FilePermission {
  sharedWith: string; // Principal as string
  canDownload: boolean;
  canView: boolean;
  expiresAt: bigint | null;
  sharedAt: bigint;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  totalChunks: number;
  currentChunk: number;
  isComplete: boolean;
  error?: string;
}

export interface ShareFileOptions {
  fileName: string;
  targetUser: string; // Principal as string
  canDownload: boolean;
  canView: boolean;
  expiryDays?: number;
}

export interface FileDownloadResult {
  fileName: string;
  fileData: Blob;
  fileType: string;
}

// File service class
class FileService {
  private vaultActor: any = null;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  /**
   * Initialize the vault actor with authenticated identity
   */
  async initializeVaultActor(identity: Identity): Promise<void> {
    try {
      const canisterId = import.meta.env.VITE_CANISTER_ID_VAULT || 'vault-canister-id';
      const host = import.meta.env.VITE_DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';

      const { agent } = await createAuthenticatedActor(identity);
      
      this.vaultActor = Actor.createActor(vaultIdlFactory, {
        agent,
        canisterId
      });

      console.log('Vault actor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vault actor:', error);
      throw error;
    }
  }

  /**
   * Check if a file already exists
   */
  async checkFileExists(fileName: string): Promise<boolean> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      return await this.vaultActor.checkFileExists(fileName);
    } catch (error) {
      console.error('Error checking file existence:', error);
      throw error;
    }
  }

  /**
   * Upload a file in chunks with progress tracking
   */
  async uploadFile(
    file: File, 
    isProfilePhoto: boolean = false,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<void> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const fileName = file.name;
      const fileType = file.type;
      const totalSize = file.size;
      const totalChunks = Math.ceil(totalSize / this.CHUNK_SIZE);

      console.log(`Starting upload: ${fileName}, Size: ${totalSize}, Chunks: ${totalChunks}`);

      // Check if file already exists
      const exists = await this.checkFileExists(fileName);
      if (exists) {
        throw new Error(`File "${fileName}" already exists`);
      }

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, totalSize);
        const chunk = file.slice(start, end);
        
        const chunkArray = new Uint8Array(await chunk.arrayBuffer());
        
        await this.vaultActor.uploadFileChunk(
          fileName,
          chunkArray,
          chunkIndex,
          fileType,
          isProfilePhoto
        );

        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        
        // Report progress
        if (onProgress) {
          onProgress({
            fileName,
            progress,
            totalChunks,
            currentChunk: chunkIndex + 1,
            isComplete: chunkIndex === totalChunks - 1
          });
        }

        console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);
      }

      console.log(`File upload completed: ${fileName}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          totalChunks: 0,
          currentChunk: 0,
          isComplete: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  /**
   * Download a file by reconstructing from chunks
   */
  async downloadFile(fileName: string): Promise<FileDownloadResult> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      // Get file metadata
      const fileType = await this.vaultActor.getFileType(fileName);
      if (!fileType) {
        throw new Error(`File "${fileName}" not found`);
      }

      // Get total number of chunks
      const totalChunks = await this.vaultActor.getTotalChunks(fileName);
      if (totalChunks === 0) {
        throw new Error(`No chunks found for file "${fileName}"`);
      }

      // Download all chunks
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkResult = await this.vaultActor.getFileChunk(fileName, i);
        if (!chunkResult || chunkResult.length === 0) {
          throw new Error(`Failed to download chunk ${i} for file "${fileName}"`);
        }
        
        chunks.push(new Uint8Array(chunkResult[0]));
      }

      // Reconstruct file
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const fileData = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of chunks) {
        fileData.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = new Blob([fileData], { type: fileType[0] });

      return {
        fileName,
        fileData: blob,
        fileType: fileType[0]
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get list of user's files with basic metadata
   */
  async getFiles(): Promise<Array<{ name: string; size: number; fileType: string }>> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      return await this.vaultActor.getFiles();
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  /**
   * Get list of user's files with enhanced metadata including permissions
   */
  async getFilesWithMetadata(): Promise<FileMetadata[]> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const files = await this.vaultActor.getFilesWithMetadata();
      
      // Convert bigint timestamps for compatibility
      return files.map((file: any) => ({
        ...file,
        createdAt: BigInt(file.createdAt),
        modifiedAt: BigInt(file.modifiedAt),
        permissions: file.permissions.map((perm: any) => ({
          ...perm,
          expiresAt: perm.expiresAt ? BigInt(perm.expiresAt[0]) : null,
          sharedAt: BigInt(perm.sharedAt)
        }))
      }));
    } catch (error) {
      console.error('Error getting files with metadata:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific file
   */
  async getFileMetadata(fileName: string): Promise<FileMetadata | null> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const result = await this.vaultActor.getFileMetadata(fileName);
      if (!result || result.length === 0) {
        return null;
      }

      const file = result[0];
      return {
        ...file,
        createdAt: BigInt(file.createdAt),
        modifiedAt: BigInt(file.modifiedAt),
        permissions: file.permissions.map((perm: any) => ({
          ...perm,
          expiresAt: perm.expiresAt ? BigInt(perm.expiresAt[0]) : null,
          sharedAt: BigInt(perm.sharedAt)
        }))
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Share a file with another user
   */
  async shareFile(options: ShareFileOptions): Promise<void> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const result = await this.vaultActor.shareFile(
        options.fileName,
        options.targetUser,
        options.canDownload,
        options.canView,
        options.expiryDays ? [options.expiryDays] : []
      );

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      console.log(`File "${options.fileName}" shared successfully with ${options.targetUser}`);
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  /**
   * Revoke file sharing permission
   */
  async revokeFileSharing(fileName: string, targetUser: string): Promise<void> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const result = await this.vaultActor.revokeFileSharing(fileName, targetUser);

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      console.log(`File sharing revoked for "${fileName}" from ${targetUser}`);
    } catch (error) {
      console.error('Error revoking file sharing:', error);
      throw error;
    }
  }

  /**
   * Get files shared with the current user
   */
  async getSharedFiles(): Promise<FileMetadata[]> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const files = await this.vaultActor.getSharedFiles();
      
      return files.map((file: any) => ({
        ...file,
        createdAt: BigInt(file.createdAt),
        modifiedAt: BigInt(file.modifiedAt),
        permissions: file.permissions.map((perm: any) => ({
          ...perm,
          expiresAt: perm.expiresAt ? BigInt(perm.expiresAt[0]) : null,
          sharedAt: BigInt(perm.sharedAt)
        }))
      }));
    } catch (error) {
      console.error('Error getting shared files:', error);
      throw error;
    }
  }

  /**
   * Get profile photo for a user
   */
  async getUserProfilePhoto(userPrincipal: string): Promise<FileMetadata | null> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const result = await this.vaultActor.getUserProfilePhoto(userPrincipal);
      if (!result || result.length === 0) {
        return null;
      }

      const file = result[0];
      return {
        ...file,
        createdAt: BigInt(file.createdAt),
        modifiedAt: BigInt(file.modifiedAt),
        permissions: file.permissions.map((perm: any) => ({
          ...perm,
          expiresAt: perm.expiresAt ? BigInt(perm.expiresAt[0]) : null,
          sharedAt: BigInt(perm.sharedAt)
        }))
      };
    } catch (error) {
      console.error('Error getting user profile photo:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      if (!this.vaultActor) {
        throw new Error('Vault actor not initialized');
      }

      const result = await this.vaultActor.deleteFile(fileName);
      if (!result) {
        throw new Error(`Failed to delete file "${fileName}"`);
      }

      console.log(`File "${fileName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Upload profile photo with automatic resizing and validation
   */
  async uploadProfilePhoto(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<void> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Profile photo must be an image file');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Profile photo must be smaller than 5MB');
      }

      // Create a unique filename for profile photos
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const profilePhotoName = `profile_photo_${timestamp}.${extension}`;

      // Create a new file with the profile photo name
      const profileFile = new File([file], profilePhotoName, { type: file.type });

      await this.uploadFile(profileFile, true, onProgress);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  }

  /**
   * Download and create object URL for file preview
   */
  async getFilePreviewUrl(fileName: string): Promise<string> {
    try {
      const downloadResult = await this.downloadFile(fileName);
      return URL.createObjectURL(downloadResult.fileData);
    } catch (error) {
      console.error('Error creating file preview URL:', error);
      throw error;
    }
  }

  /**
   * Utility function to format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon class based on file extension
   */
  getFileTypeIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const iconMap: { [key: string]: string } = {
      // Images
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      
      // Documents
      'pdf': 'file-text',
      'doc': 'file-text',
      'docx': 'file-text',
      'txt': 'file-text',
      'rtf': 'file-text',
      
      // Spreadsheets
      'xls': 'file-spreadsheet',
      'xlsx': 'file-spreadsheet',
      'csv': 'file-spreadsheet',
      
      // Archives
      'zip': 'file-archive',
      'rar': 'file-archive',
      '7z': 'file-archive',
      'tar': 'file-archive',
      'gz': 'file-archive',
      
      // Videos
      'mp4': 'video',
      'avi': 'video',
      'mov': 'video',
      'wmv': 'video',
      'flv': 'video',
      'webm': 'video',
      
      // Audio
      'mp3': 'music',
      'wav': 'music',
      'flac': 'music',
      'aac': 'music',
      'ogg': 'music',
    };

    return iconMap[extension] || 'file';
  }
}

// Export singleton instance
export const fileService = new FileService();
