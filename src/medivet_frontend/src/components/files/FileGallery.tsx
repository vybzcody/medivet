/**
 * File Gallery Component
 * 
 * A responsive gallery view for displaying and managing uploaded files
 * with grid/list views, search, filtering, and file operations.
 */

import React, { useEffect, useState } from 'react';
import {
  Grid3X3,
  List,
  Search,
  Filter,
  Upload,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  File,
  Image,
  Video,
  Music,
  FileArchive,
  FileText,
  Eye,
  Calendar,
  User,
  Check
} from 'lucide-react';
import useFileStore, { FileViewMode, FileFilter } from '../../stores/useFileStore';
import { FileMetadata, fileService } from '../../services/fileService';

export interface FileGalleryProps {
  className?: string;
  showUpload?: boolean;
  allowSelection?: boolean;
  selectedFiles?: string[];
  onFileSelect?: (fileName: string) => void;
  onFilesSelect?: (fileNames: string[]) => void;
}

const FileGallery: React.FC<FileGalleryProps> = ({
  className = '',
  showUpload = true,
  allowSelection = false,
  selectedFiles = [],
  onFileSelect,
  onFilesSelect
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFileMenu, setSelectedFileMenu] = useState<string | null>(null);

  const {
    files,
    viewMode,
    filter,
    searchQuery,
    isLoading,
    error,
    selectedFiles: storeSelectedFiles,
    loadFiles,
    setViewMode,
    setFilter,
    setSearchQuery,
    toggleFileSelection,
    clearSelection,
    downloadFile,
    deleteFile,
    openFilePreview,
    openShareModal,
    openUploadModal,
    getFilteredFiles
  } = useFileStore();

  const filteredFiles = getFilteredFiles();

  // Load files on component mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Get file type icon
  const getFileIcon = (file: FileMetadata) => {
    const iconClass = "w-5 h-5";
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (file.isProfilePhoto || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return <Image className={iconClass} />;
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return <Video className={iconClass} />;
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
      return <Music className={iconClass} />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return <FileArchive className={iconClass} />;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return <FileText className={iconClass} />;
    } else {
      return <File className={iconClass} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    return fileService.formatFileSize(bytes);
  };

  // Format date
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString();
  };

  // Handle file action
  const handleFileAction = async (action: string, fileName: string) => {
    setSelectedFileMenu(null);
    
    switch (action) {
      case 'preview':
        openFilePreview(fileName);
        break;
      case 'download':
        await downloadFile(fileName);
        break;
      case 'share':
        // TODO: Implement share modal
        openShareModal();
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
          await deleteFile(fileName);
        }
        break;
    }
  };

  // Handle file selection
  const handleFileClick = (fileName: string, event: React.MouseEvent) => {
    if (allowSelection) {
      if (event.ctrlKey || event.metaKey) {
        toggleFileSelection(fileName);
      } else {
        clearSelection();
        toggleFileSelection(fileName);
      }
      
      const currentSelected = storeSelectedFiles.includes(fileName) 
        ? storeSelectedFiles 
        : [...storeSelectedFiles, fileName];
      
      if (onFileSelect) onFileSelect(fileName);
      if (onFilesSelect) onFilesSelect(currentSelected);
    } else {
      openFilePreview(fileName);
    }
  };

  // Filter options
  const filterOptions: { value: FileFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Files', icon: <File className="w-4 h-4" /> },
    { value: 'images', label: 'Images', icon: <Image className="w-4 h-4" /> },
    { value: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { value: 'videos', label: 'Videos', icon: <Video className="w-4 h-4" /> },
    { value: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
    { value: 'archives', label: 'Archives', icon: <FileArchive className="w-4 h-4" /> },
    { value: 'profile', label: 'Profile Photos', icon: <User className="w-4 h-4" /> },
  ];

  // Grid view component
  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredFiles.map((file) => (
        <div
          key={file.name}
          className={`
            relative group border border-gray-200 rounded-lg overflow-hidden cursor-pointer
            hover:border-blue-300 hover:shadow-md transition-all duration-200
            ${storeSelectedFiles.includes(file.name) ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          `}
          onClick={(e) => handleFileClick(file.name, e)}
        >
          {/* File preview area */}
          <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
            {getFileIcon(file)}
          </div>
          
          {/* File info */}
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {formatFileSize(file.size)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(file.modifiedAt)}
            </p>
          </div>
          
          {/* Selection checkbox */}
          {allowSelection && (
            <div className="absolute top-2 left-2">
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${storeSelectedFiles.includes(file.name) 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-white border-gray-300 group-hover:border-blue-400'
                }
              `}>
                {storeSelectedFiles.includes(file.name) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
          )}
          
          {/* Action menu */}
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileMenu(selectedFileMenu === file.name ? null : file.name);
              }}
              className="p-1 bg-white bg-opacity-80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {selectedFileMenu === file.name && (
              <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  onClick={() => handleFileAction('preview', file.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleFileAction('download', file.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleFileAction('share', file.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => handleFileAction('delete', file.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Profile photo badge */}
          {file.isProfilePhoto && (
            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Profile
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // List view component
  const ListView = () => (
    <div className="space-y-2">
      {filteredFiles.map((file) => (
        <div
          key={file.name}
          className={`
            flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer
            hover:border-blue-300 hover:bg-blue-50 transition-all duration-200
            ${storeSelectedFiles.includes(file.name) ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
          `}
          onClick={(e) => handleFileClick(file.name, e)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Selection checkbox */}
            {allowSelection && (
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${storeSelectedFiles.includes(file.name) 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-white border-gray-300'
                }
              `}>
                {storeSelectedFiles.includes(file.name) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
            )}
            
            {/* File icon */}
            <div className="flex-shrink-0">
              {getFileIcon(file)}
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </h3>
                {file.isProfilePhoto && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Profile
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(file.modifiedAt)}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileAction('preview', file.name);
              }}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileAction('download', file.name);
              }}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileAction('share', file.name);
              }}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileMenu(selectedFileMenu === file.name ? null : file.name);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {selectedFileMenu === file.name && (
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  onClick={() => handleFileAction('delete', file.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Files</h2>
          {storeSelectedFiles.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {storeSelectedFiles.length} selected
            </span>
          )}
        </div>
        
        {showUpload && (
          <button
            onClick={openUploadModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        {/* Search and filter */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {filterOptions.find(f => f.value === filter)?.label}
              </span>
            </button>
            
            {showFilterMenu && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterMenu(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2
                      ${filter === option.value ? 'bg-blue-50 text-blue-700' : ''}
                    `}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`
              p-2 rounded transition-colors
              ${viewMode === 'grid' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`
              p-2 rounded transition-colors
              ${viewMode === 'list' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filter !== 'all' 
              ? 'No files match your current search or filter.' 
              : 'Upload your first file to get started.'
            }
          </p>
          {showUpload && (
            <button
              onClick={openUploadModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          )}
        </div>
      ) : (
        viewMode === 'grid' ? <GridView /> : <ListView />
      )}

      {/* Click outside handler for menus */}
      {(showFilterMenu || selectedFileMenu) && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowFilterMenu(false);
            setSelectedFileMenu(null);
          }}
        />
      )}
    </div>
  );
};

export default FileGallery;
