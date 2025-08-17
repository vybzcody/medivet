/**
 * File Management Store
 * 
 * Zustand store for managing file upload progress, file operations,
 * gallery view state, and file management UI state.
 */

import { create } from 'zustand';
import { 
  FileMetadata, 
  FileUploadProgress, 
  ShareFileOptions, 
  fileService 
} from '../services/fileService';

export type FileViewMode = 'grid' | 'list';
export type FileFilter = 'all' | 'images' | 'documents' | 'videos' | 'audio' | 'archives' | 'profile';

export interface FileOperation {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'share';
  fileName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress?: number;
  error?: string;
  createdAt: number;
}

export interface FileStoreState {
  // File data
  files: FileMetadata[];
  sharedFiles: FileMetadata[];
  selectedFiles: string[];
  
  // Upload progress tracking
  uploadProgress: Map<string, FileUploadProgress>;
  
  // File operations tracking
  operations: FileOperation[];
  
  // UI state
  viewMode: FileViewMode;
  filter: FileFilter;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  
  // Gallery state
  selectedFileForPreview: string | null;
  showFilePreview: boolean;
  showShareModal: boolean;
  showUploadModal: boolean;
  
  // Profile photo state
  profilePhotoUrl: string | null;
  isUploadingProfilePhoto: boolean;
}

export interface FileStoreActions {
  // File operations
  loadFiles: () => Promise<void>;
  loadSharedFiles: () => Promise<void>;
  uploadFile: (file: File, isProfilePhoto?: boolean) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  downloadFile: (fileName: string) => Promise<void>;
  deleteFile: (fileName: string) => Promise<void>;
  shareFile: (options: ShareFileOptions) => Promise<void>;
  revokeFileSharing: (fileName: string, targetUser: string) => Promise<void>;
  
  // File selection
  selectFile: (fileName: string) => void;
  selectMultipleFiles: (fileNames: string[]) => void;
  deselectFile: (fileName: string) => void;
  clearSelection: () => void;
  toggleFileSelection: (fileName: string) => void;
  
  // UI state management
  setViewMode: (mode: FileViewMode) => void;
  setFilter: (filter: FileFilter) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  
  // Modal state
  openFilePreview: (fileName: string) => void;
  closeFilePreview: () => void;
  openShareModal: () => void;
  closeShareModal: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  
  // Operations management
  addOperation: (operation: Omit<FileOperation, 'id' | 'createdAt'>) => string;
  updateOperation: (id: string, updates: Partial<FileOperation>) => void;
  removeOperation: (id: string) => void;
  clearCompletedOperations: () => void;
  
  // Profile photo
  loadProfilePhoto: (userPrincipal?: string) => Promise<void>;
  
  // Utility functions
  getFilteredFiles: () => FileMetadata[];
  getFileByName: (fileName: string) => FileMetadata | undefined;
  getUploadProgress: (fileName: string) => FileUploadProgress | undefined;
  getPendingUploads: () => FileUploadProgress[];
  getRecentOperations: () => FileOperation[];
}

type FileStore = FileStoreState & FileStoreActions;

const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  files: [],
  sharedFiles: [],
  selectedFiles: [],
  uploadProgress: new Map(),
  operations: [],
  viewMode: 'grid',
  filter: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,
  selectedFileForPreview: null,
  showFilePreview: false,
  showShareModal: false,
  showUploadModal: false,
  profilePhotoUrl: null,
  isUploadingProfilePhoto: false,

  // File operations
  loadFiles: async () => {
    try {
      set({ isLoading: true, error: null });
      const files = await fileService.getFilesWithMetadata();
      set({ files, isLoading: false });
    } catch (error) {
      console.error('Failed to load files:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load files',
        isLoading: false 
      });
    }
  },

  loadSharedFiles: async () => {
    try {
      const sharedFiles = await fileService.getSharedFiles();
      set({ sharedFiles });
    } catch (error) {
      console.error('Failed to load shared files:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load shared files' });
    }
  },

  uploadFile: async (file: File, isProfilePhoto = false) => {
    const { addOperation, updateOperation } = get();
    
    const operationId = addOperation({
      type: 'upload',
      fileName: file.name,
      status: 'in-progress'
    });

    try {
      await fileService.uploadFile(file, isProfilePhoto, (progress) => {
        set((state) => ({
          uploadProgress: new Map(state.uploadProgress.set(file.name, progress))
        }));
        
        updateOperation(operationId, {
          status: 'in-progress',
          progress: progress.progress
        });
      });

      updateOperation(operationId, {
        status: 'completed',
        progress: 100
      });

      // Remove upload progress and reload files
      set((state) => {
        const newProgress = new Map(state.uploadProgress);
        newProgress.delete(file.name);
        return { uploadProgress: newProgress };
      });

      await get().loadFiles();
      
    } catch (error) {
      console.error('Upload failed:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      
      set((state) => {
        const newProgress = new Map(state.uploadProgress);
        newProgress.delete(file.name);
        return { uploadProgress: newProgress };
      });
    }
  },

  uploadProfilePhoto: async (file: File) => {
    try {
      set({ isUploadingProfilePhoto: true, error: null });
      
      await fileService.uploadProfilePhoto(file, (progress) => {
        set((state) => ({
          uploadProgress: new Map(state.uploadProgress.set('profile_photo', progress))
        }));
      });

      set({ isUploadingProfilePhoto: false });
      
      // Remove upload progress and reload files
      set((state) => {
        const newProgress = new Map(state.uploadProgress);
        newProgress.delete('profile_photo');
        return { uploadProgress: newProgress };
      });

      await get().loadFiles();
      await get().loadProfilePhoto();
      
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      set({ 
        isUploadingProfilePhoto: false,
        error: error instanceof Error ? error.message : 'Profile photo upload failed'
      });
      
      set((state) => {
        const newProgress = new Map(state.uploadProgress);
        newProgress.delete('profile_photo');
        return { uploadProgress: newProgress };
      });
    }
  },

  downloadFile: async (fileName: string) => {
    const { addOperation, updateOperation } = get();
    
    const operationId = addOperation({
      type: 'download',
      fileName,
      status: 'in-progress'
    });

    try {
      const result = await fileService.downloadFile(fileName);
      
      // Create download link
      const url = URL.createObjectURL(result.fileData);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      updateOperation(operationId, { status: 'completed' });
      
    } catch (error) {
      console.error('Download failed:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed'
      });
    }
  },

  deleteFile: async (fileName: string) => {
    const { addOperation, updateOperation } = get();
    
    const operationId = addOperation({
      type: 'delete',
      fileName,
      status: 'in-progress'
    });

    try {
      await fileService.deleteFile(fileName);
      updateOperation(operationId, { status: 'completed' });
      await get().loadFiles();
      
    } catch (error) {
      console.error('Delete failed:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Delete failed'
      });
    }
  },

  shareFile: async (options: ShareFileOptions) => {
    const { addOperation, updateOperation } = get();
    
    const operationId = addOperation({
      type: 'share',
      fileName: options.fileName,
      status: 'in-progress'
    });

    try {
      await fileService.shareFile(options);
      updateOperation(operationId, { status: 'completed' });
      await get().loadFiles();
      
    } catch (error) {
      console.error('Share failed:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Share failed'
      });
    }
  },

  revokeFileSharing: async (fileName: string, targetUser: string) => {
    try {
      await fileService.revokeFileSharing(fileName, targetUser);
      await get().loadFiles();
      
    } catch (error) {
      console.error('Revoke sharing failed:', error);
      set({ error: error instanceof Error ? error.message : 'Revoke sharing failed' });
    }
  },

  // File selection
  selectFile: (fileName: string) => {
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(fileName) 
        ? state.selectedFiles 
        : [...state.selectedFiles, fileName]
    }));
  },

  selectMultipleFiles: (fileNames: string[]) => {
    set({ selectedFiles: Array.from(new Set(fileNames)) });
  },

  deselectFile: (fileName: string) => {
    set((state) => ({
      selectedFiles: state.selectedFiles.filter(f => f !== fileName)
    }));
  },

  clearSelection: () => {
    set({ selectedFiles: [] });
  },

  toggleFileSelection: (fileName: string) => {
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(fileName)
        ? state.selectedFiles.filter(f => f !== fileName)
        : [...state.selectedFiles, fileName]
    }));
  },

  // UI state management
  setViewMode: (mode: FileViewMode) => {
    set({ viewMode: mode });
  },

  setFilter: (filter: FileFilter) => {
    set({ filter });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Modal state
  openFilePreview: (fileName: string) => {
    set({ selectedFileForPreview: fileName, showFilePreview: true });
  },

  closeFilePreview: () => {
    set({ selectedFileForPreview: null, showFilePreview: false });
  },

  openShareModal: () => {
    set({ showShareModal: true });
  },

  closeShareModal: () => {
    set({ showShareModal: false });
  },

  openUploadModal: () => {
    set({ showUploadModal: true });
  },

  closeUploadModal: () => {
    set({ showUploadModal: false });
  },

  // Operations management
  addOperation: (operation: Omit<FileOperation, 'id' | 'createdAt'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newOperation: FileOperation = {
      ...operation,
      id,
      createdAt: Date.now()
    };
    
    set((state) => ({
      operations: [...state.operations, newOperation]
    }));
    
    return id;
  },

  updateOperation: (id: string, updates: Partial<FileOperation>) => {
    set((state) => ({
      operations: state.operations.map(op => 
        op.id === id ? { ...op, ...updates } : op
      )
    }));
  },

  removeOperation: (id: string) => {
    set((state) => ({
      operations: state.operations.filter(op => op.id !== id)
    }));
  },

  clearCompletedOperations: () => {
    set((state) => ({
      operations: state.operations.filter(op => op.status !== 'completed')
    }));
  },

  // Profile photo
  loadProfilePhoto: async (userPrincipal?: string) => {
    try {
      // If no principal provided, use current user (will be determined by the service)
      const photoMetadata = await fileService.getUserProfilePhoto(userPrincipal || '');
      
      if (photoMetadata) {
        const photoUrl = await fileService.getFilePreviewUrl(photoMetadata.name);
        set({ profilePhotoUrl: photoUrl });
      } else {
        set({ profilePhotoUrl: null });
      }
    } catch (error) {
      console.error('Failed to load profile photo:', error);
      set({ profilePhotoUrl: null });
    }
  },

  // Utility functions
  getFilteredFiles: () => {
    const { files, filter, searchQuery } = get();
    
    let filteredFiles = files;
    
    // Apply filter
    if (filter !== 'all') {
      filteredFiles = files.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        switch (filter) {
          case 'images':
            return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension);
          case 'documents':
            return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension);
          case 'videos':
            return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension);
          case 'audio':
            return ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension);
          case 'archives':
            return ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
          case 'profile':
            return file.isProfilePhoto;
          default:
            return true;
        }
      });
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.fileType.toLowerCase().includes(query)
      );
    }
    
    return filteredFiles;
  },

  getFileByName: (fileName: string) => {
    return get().files.find(file => file.name === fileName);
  },

  getUploadProgress: (fileName: string) => {
    return get().uploadProgress.get(fileName);
  },

  getPendingUploads: () => {
    return Array.from(get().uploadProgress.values()).filter(progress => !progress.isComplete);
  },

  getRecentOperations: () => {
    return get().operations
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }
}));

export default useFileStore;
