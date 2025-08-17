/**
 * Profile Photo Upload Component
 * 
 * A drag-and-drop profile photo upload interface with preview, 
 * validation, and upload progress tracking.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, User, Camera, X, Loader2, AlertCircle } from 'lucide-react';
import useFileStore from '../../stores/useFileStore';
import useAuthStore from '../../stores/useAuthStore';
import { fileService } from '../../services/fileService';

export interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onUploadComplete?: (photoUrl: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  onUploadComplete,
  onUploadError,
  className = '',
  size = 'medium',
  showLabel = true
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadProfilePhoto,
    isUploadingProfilePhoto,
    getUploadProgress,
    error,
    setError
  } = useFileStore();

  // Size configurations
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  const iconSizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  const uploadProgress = getUploadProgress('profile_photo');

  // Validate file before processing
  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'Image must be smaller than 5MB';
    }
    
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      return 'Supported formats: JPEG, PNG, WebP';
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) onUploadError(validationError);
      return;
    }

    setSelectedFile(file);
    
    // Convert file to data URL for better CSP compatibility and persistence
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      reader.onerror = () => {
        // Fallback to blob URL if data URL conversion fails
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      // Fallback to blob URL if FileReader is not available
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  }, [setError, onUploadError]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (fileInputRef.current && !isUploadingProfilePhoto) {
      fileInputRef.current.click();
    }
  }, [isUploadingProfilePhoto]);

  // Upload the selected file
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      // Get current auth store state to ensure file service is initialized
      const authState = useAuthStore.getState();
      
      if (!authState.isAuthenticated || !authState.identity) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // Initialize file service if not already done
      try {
        await fileService.initializeVaultActor(authState.identity);
        console.log('File service initialized before upload');
      } catch (initError) {
        console.error('Failed to initialize file service:', initError);
        throw new Error('Failed to initialize file service');
      }
      
      await uploadProfilePhoto(selectedFile);
      
      // Keep the preview URL for display and pass the actual file name
      if (onUploadComplete) {
        // Generate the profile photo filename that will be used
        const timestamp = Date.now();
        const extension = selectedFile.name.split('.').pop() || 'jpg';
        const profilePhotoName = `profile_photo_${timestamp}.${extension}`;
        onUploadComplete(previewUrl || profilePhotoName);
      }
      
      // Keep the preview after successful upload so user can see their photo
      setSelectedFile(null);
      // Don't clear previewUrl so the user can see their uploaded photo
      
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (onUploadError) onUploadError(errorMessage);
    }
  }, [selectedFile, uploadProfilePhoto, onUploadComplete, onUploadError, previewUrl]);

  // Cancel file selection
  const handleCancel = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      // Only revoke blob URLs, not data URLs
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl, setError]);

  // Determine what to show in the photo area
  const getPhotoContent = () => {
    if (isUploadingProfilePhoto) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className={`${iconSizes[size]} animate-spin text-blue-500`} />
          {uploadProgress && (
            <div className="mt-2 text-xs text-gray-500">
              {uploadProgress.progress}%
            </div>
          )}
        </div>
      );
    }
    
    if (previewUrl) {
      return (
        <img
          src={previewUrl}
          alt="Profile preview"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    
    if (currentPhotoUrl) {
      return (
        <img
          src={currentPhotoUrl}
          alt="Current profile"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <User className={`${iconSizes[size]} text-gray-400`} />
        {size !== 'small' && (
          <div className="mt-1 text-xs text-gray-500">No photo</div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {showLabel && (
        <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
      )}
      
      {/* Photo Display Area */}
      <div className="relative">
        <div
          className={`
            ${sizeClasses[size]} rounded-full border-2 border-dashed border-gray-300 
            bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer
            transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
            ${dragOver ? 'border-blue-500 bg-blue-50' : ''}
            ${isUploadingProfilePhoto ? 'cursor-not-allowed opacity-70' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {getPhotoContent()}
          
          {/* Upload overlay */}
          {!isUploadingProfilePhoto && !previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-full">
              <Camera className={`${iconSizes[size]} text-white opacity-0 hover:opacity-100 transition-opacity`} />
            </div>
          )}
        </div>
        
        {/* Cancel button for preview */}
        {previewUrl && !isUploadingProfilePhoto && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Actions */}
      {selectedFile && !isUploadingProfilePhoto && (
        <div className="flex space-x-3">
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
          
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload Instructions */}
      {!selectedFile && !currentPhotoUrl && !isUploadingProfilePhoto && size !== 'small' && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Click or drag to upload a photo
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPEG, PNG or WebP • Max 5MB
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && isUploadingProfilePhoto && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Uploading...</span>
            <span className="text-xs text-gray-600">{uploadProgress.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
