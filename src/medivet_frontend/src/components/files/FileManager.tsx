/**
 * File Manager Component
 * 
 * Main file management interface that integrates gallery view,
 * upload functionality, sharing, and file operations.
 * Provides a Google Drive-like experience for file management.
 */

import React, { useEffect, useState } from 'react';
import { Folder, Upload as UploadIcon, Share2, Trash2, Download, Settings, HardDrive } from 'lucide-react';
import FileGallery from './FileGallery';
import FileUploadModal from './FileUploadModal';
import FileShareModal from './FileShareModal';
import ProfilePhotoUpload from '../common/ProfilePhotoUpload';
import useFileStore from '../../stores/useFileStore';
import { fileService } from '../../services/fileService';

export interface FileManagerProps {
  className?: string;
  showProfilePhotoSection?: boolean;
  initialView?: 'all' | 'profile' | 'shared';
}

const FileManager: React.FC<FileManagerProps> = ({
  className = '',
  showProfilePhotoSection = true,
  initialView = 'all'
}) => {
  const [activeTab, setActiveTab] = useState<'my-files' | 'shared-with-me' | 'profile'>(
    initialView === 'shared' ? 'shared-with-me' : initialView === 'profile' ? 'profile' : 'my-files'
  );

  const {
    files,
    sharedFiles,
    selectedFiles,
    isLoading,
    error,
    profilePhotoUrl,
    showUploadModal,
    showShareModal,
    loadFiles,
    loadSharedFiles,
    loadProfilePhoto,
    clearSelection,
    openUploadModal,
    closeUploadModal,
    openShareModal,
    closeShareModal,
    deleteFile,
    downloadFile,
    setFilter,
    getFilteredFiles
  } = useFileStore();

  // Initialize file service and load data
  useEffect(() => {
    const initializeFileManager = async () => {
      try {
        // Initialize file service if needed
        // The service will be initialized when the user is authenticated
        
        // Load initial data
        await Promise.all([
          loadFiles(),
          loadSharedFiles(),
          // Skip loadProfilePhoto here since we don't have access to auth store
          Promise.resolve()
        ]);
      } catch (error) {
        console.error('Failed to initialize file manager:', error);
      }
    };

    initializeFileManager();
  }, [loadFiles, loadSharedFiles, loadProfilePhoto, showProfilePhotoSection]);

  // Handle bulk operations
  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.length} selected file${selectedFiles.length !== 1 ? 's' : ''}?`
    );
    
    if (confirmed) {
      try {
        await Promise.all(selectedFiles.map(fileName => deleteFile(fileName)));
        clearSelection();
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      // Download files sequentially to avoid overwhelming the browser
      for (const fileName of selectedFiles) {
        await downloadFile(fileName);
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Bulk download failed:', error);
    }
  };

  const handleBulkShare = () => {
    if (selectedFiles.length === 0) return;
    openShareModal();
  };

  // Get storage stats
  const getStorageStats = () => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const fileCount = files.length;
    const profilePhotoCount = files.filter(file => file.isProfilePhoto).length;
    
    return {
      totalSize: fileService.formatFileSize(totalSize),
      fileCount,
      profilePhotoCount
    };
  };

  const storageStats = getStorageStats();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <HardDrive className="w-6 h-6 text-blue-500" />
              <span>File Manager</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your files with secure upload, sharing, and organization
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-700">
                  {selectedFiles.length} selected
                </span>
                <button
                  onClick={handleBulkDownload}
                  className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                  title="Download selected"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBulkShare}
                  className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                  title="Share selected"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="p-1 text-red-600 hover:text-red-700 transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={openUploadModal}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <UploadIcon className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => {
              setActiveTab('my-files');
              setFilter('all');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'my-files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4" />
              <span>My Files</span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {storageStats.fileCount}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('shared-with-me');
              setFilter('all');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'shared-with-me'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Shared with me</span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {sharedFiles.length}
              </span>
            </div>
          </button>
          
          {showProfilePhotoSection && (
            <button
              onClick={() => {
                setActiveTab('profile');
                setFilter('profile');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Profile</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {storageStats.profilePhotoCount}
                </span>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Storage Stats */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div>
                <span className="text-gray-500">Total Storage:</span>
                <span className="ml-1 font-medium text-gray-900">{storageStats.totalSize}</span>
              </div>
              <div>
                <span className="text-gray-500">Files:</span>
                <span className="ml-1 font-medium text-gray-900">{storageStats.fileCount}</span>
              </div>
              {showProfilePhotoSection && (
                <div>
                  <span className="text-gray-500">Profile Photos:</span>
                  <span className="ml-1 font-medium text-gray-900">{storageStats.profilePhotoCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-files' && (
          <FileGallery
            allowSelection={true}
            showUpload={true}
            className="min-h-[400px]"
          />
        )}

        {activeTab === 'shared-with-me' && (
          <div className="min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : sharedFiles.length === 0 ? (
              <div className="text-center py-12">
                <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shared files</h3>
                <p className="text-gray-600">
                  Files shared with you by other users will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Files shared with you ({sharedFiles.length})
                </h3>
                {/* TODO: Implement shared files list */}
                <div className="text-gray-500">
                  Shared files display will be implemented here
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && showProfilePhotoSection && (
          <div className="space-y-8">
            {/* Profile Photo Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <ProfilePhotoUpload
                currentPhotoUrl={profilePhotoUrl}
                onUploadComplete={(url) => {
                  // Refresh profile photo
                  // Note: Profile photo refresh will be handled by the ProfilePhotoUpload component
                  console.log('Profile photo uploaded:', url);
                }}
                onUploadError={(error) => {
                  console.error('Profile photo upload error:', error);
                }}
                size="large"
                className="items-center"
              />
            </div>

            {/* Profile Photos Gallery */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photos</h3>
              <FileGallery
                allowSelection={true}
                showUpload={false}
                className="min-h-[300px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={closeUploadModal}
        acceptedTypes={['*']}
        maxFileSize={50 * 1024 * 1024} // 50MB
        maxFiles={10}
      />

      <FileShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        selectedFiles={selectedFiles}
      />

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileManager;
