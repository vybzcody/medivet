/**
 * File Upload Modal
 * 
 * Modal component for uploading multiple files with drag-and-drop,
 * progress tracking, and file validation.
 */

import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import useFileStore from '../../stores/useFileStore';
import { FileUploadProgress } from '../../services/fileService';

export interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  acceptedTypes = ['*'],
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, getUploadProgress } = useFileStore();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setDragOver(false);
      setIsUploading(false);
    }
  }, [isOpen]);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }

    if (acceptedTypes.length > 0 && !acceptedTypes.includes('*')) {
      const fileType = file.type;
      const isValidType = acceptedTypes.some(type => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isValidType) {
        return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
      }
    }

    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: File[]) => {
    const newFiles: FileWithStatus[] = [];
    
    for (let i = 0; i < Math.min(files.length, maxFiles - selectedFiles.length); i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      newFiles.push({
        file,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined
      });
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles, maxFiles, maxFileSize, acceptedTypes]);

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
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(Array.from(files));
    }
  }, [handleFileSelect]);

  // Remove file from list
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload all valid files
  const handleUploadAll = async () => {
    const validFiles = selectedFiles.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const fileWithStatus = validFiles[i];
        
        // Update status to uploading
        setSelectedFiles(prev => 
          prev.map((f, idx) => 
            f.file === fileWithStatus.file 
              ? { ...f, status: 'uploading' as const }
              : f
          )
        );

        try {
          await uploadFile(fileWithStatus.file, false);
          
          // Update status to completed
          setSelectedFiles(prev => 
            prev.map((f, idx) => 
              f.file === fileWithStatus.file 
                ? { ...f, status: 'completed' as const, progress: 100 }
                : f
            )
          );
        } catch (error) {
          console.error('Upload failed:', error);
          
          // Update status to error
          setSelectedFiles(prev => 
            prev.map((f, idx) => 
              f.file === fileWithStatus.file 
                ? { 
                    ...f, 
                    status: 'error' as const, 
                    error: error instanceof Error ? error.message : 'Upload failed'
                  }
                : f
            )
          );
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Update progress from store
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSelectedFiles(prev => 
        prev.map(fileWithStatus => {
          if (fileWithStatus.status === 'uploading') {
            const progress = getUploadProgress(fileWithStatus.file.name);
            if (progress) {
              return { ...fileWithStatus, progress: progress.progress };
            }
          }
          return fileWithStatus;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [getUploadProgress]);

  const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
  const completedFiles = selectedFiles.filter(f => f.status === 'completed');
  const errorFiles = selectedFiles.filter(f => f.status === 'error');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          {selectedFiles.length === 0 && (
            <div
              className={`
                border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer
                transition-colors duration-200 hover:border-blue-400 hover:bg-blue-50
                ${dragOver ? 'border-blue-500 bg-blue-50' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload your files
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop files here, or click to select files
              </p>
              <div className="text-sm text-gray-500">
                <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
                <p>Maximum files: {maxFiles}</p>
                {acceptedTypes.length > 0 && !acceptedTypes.includes('*') && (
                  <p>Accepted types: {acceptedTypes.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Selected Files ({selectedFiles.length})
                </h3>
                {pendingFiles.length > 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add more files
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedFiles.map((fileWithStatus, index) => (
                  <div
                    key={`${fileWithStatus.file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {fileWithStatus.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : fileWithStatus.status === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : fileWithStatus.status === 'uploading' ? (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : (
                          <File className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileWithStatus.file.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileWithStatus.file.size)}
                          </p>
                          {fileWithStatus.status === 'error' && fileWithStatus.error && (
                            <p className="text-xs text-red-600">
                              {fileWithStatus.error}
                            </p>
                          )}
                          {fileWithStatus.status === 'uploading' && fileWithStatus.progress !== undefined && (
                            <p className="text-xs text-blue-600">
                              {fileWithStatus.progress}%
                            </p>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        {fileWithStatus.status === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${fileWithStatus.progress || 0}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {fileWithStatus.status !== 'uploading' && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload Summary */}
              {(completedFiles.length > 0 || errorFiles.length > 0) && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {completedFiles.length > 0 && (
                    <p className="text-green-600 font-medium">
                      ✓ {completedFiles.length} files uploaded successfully
                    </p>
                  )}
                  {errorFiles.length > 0 && (
                    <p className="text-red-600 font-medium">
                      ✗ {errorFiles.length} files failed to upload
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept={acceptedTypes.includes('*') ? undefined : acceptedTypes.join(',')}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFiles.length > 0 && (
              <span>
                {pendingFiles.length} files ready to upload
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {completedFiles.length > 0 ? 'Close' : 'Cancel'}
            </button>
            
            {pendingFiles.length > 0 && (
              <button
                onClick={handleUploadAll}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isUploading 
                    ? 'Uploading...' 
                    : `Upload ${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
