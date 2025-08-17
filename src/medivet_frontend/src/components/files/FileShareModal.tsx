/**
 * File Share Modal
 * 
 * Modal component for sharing files with other users,
 * setting permissions, and managing expiry dates.
 */

import React, { useState, useEffect } from 'react';
import { X, Share2, User, Calendar, Eye, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import useFileStore from '../../stores/useFileStore';
import { FileMetadata } from '../../services/fileService';

export interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles?: string[];
}

interface ShareSettings {
  targetPrincipal: string;
  canView: boolean;
  canDownload: boolean;
  expiryDays: number | null;
}

const FileShareModal: React.FC<FileShareModalProps> = ({
  isOpen,
  onClose,
  selectedFiles = []
}) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    targetPrincipal: '',
    canView: true,
    canDownload: false,
    expiryDays: null
  });
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const { files, shareFile, getFileByName } = useFileStore();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShareSettings({
        targetPrincipal: '',
        canView: true,
        canDownload: false,
        expiryDays: null
      });
      setIsSharing(false);
      setShareResult(null);
      setValidationError('');
    }
  }, [isOpen]);

  // Get selected file objects
  const selectedFileObjects = selectedFiles.map(fileName => getFileByName(fileName)).filter(Boolean) as FileMetadata[];

  // Validate principal format (basic validation)
  const validatePrincipal = (principal: string): boolean => {
    if (!principal.trim()) return false;
    // Basic validation - principals are typically base32-encoded strings ending with -cai or similar
    const principalRegex = /^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/;
    const shortPrincipalRegex = /^[a-z0-9]{5}-[a-z0-9]{3}$/;
    return principalRegex.test(principal) || shortPrincipalRegex.test(principal) || principal.length >= 20;
  };

  // Handle share settings change
  const handleSettingChange = (key: keyof ShareSettings, value: any) => {
    setShareSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setValidationError('');
    setShareResult(null);
  };

  // Handle share action
  const handleShare = async () => {
    // Validation
    if (!validatePrincipal(shareSettings.targetPrincipal)) {
      setValidationError('Please enter a valid principal ID');
      return;
    }

    if (!shareSettings.canView && !shareSettings.canDownload) {
      setValidationError('Please grant at least one permission (view or download)');
      return;
    }

    if (selectedFiles.length === 0) {
      setValidationError('Please select at least one file to share');
      return;
    }

    setIsSharing(true);
    setValidationError('');
    setShareResult(null);

    try {
      const sharePromises = selectedFiles.map(fileName =>
        shareFile({
          fileName,
          targetUser: shareSettings.targetPrincipal.trim(),
          canView: shareSettings.canView,
          canDownload: shareSettings.canDownload,
          expiryDays: shareSettings.expiryDays || undefined
        })
      );

      await Promise.all(sharePromises);

      setShareResult({
        success: true,
        message: `Successfully shared ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} with ${shareSettings.targetPrincipal}`
      });

    } catch (error) {
      console.error('Share failed:', error);
      setShareResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to share files'
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Preset expiry options
  const expiryOptions = [
    { label: 'Never expires', value: null },
    { label: '1 day', value: 1 },
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Share2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">Share Files</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSharing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Files */}
          {selectedFileObjects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Files to share ({selectedFileObjects.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFileObjects.map((file, index) => (
                  <div
                    key={file.name}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-medium">
                        {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share With */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Share with (Principal ID)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={shareSettings.targetPrincipal}
                onChange={(e) => handleSettingChange('targetPrincipal', e.target.value)}
                placeholder="Enter principal ID (e.g., rdmx6-jaaaa-aaaah-qcaiq-cai)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSharing}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              The recipient's principal ID from their Internet Identity
            </p>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Permissions</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shareSettings.canView}
                  onChange={(e) => handleSettingChange('canView', e.target.checked)}
                  disabled={isSharing}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">Can view</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Allow viewing file details and metadata
                  </p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shareSettings.canDownload}
                  onChange={(e) => handleSettingChange('canDownload', e.target.checked)}
                  disabled={isSharing}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">Can download</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Allow downloading the actual file content
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Access expires
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={shareSettings.expiryDays || ''}
                onChange={(e) => handleSettingChange('expiryDays', e.target.value ? parseInt(e.target.value) : null)}
                disabled={isSharing}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {expiryOptions.map((option) => (
                  <option key={option.label} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Share Result */}
          {shareResult && (
            <div className={`flex items-center space-x-2 text-sm ${
              shareResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {shareResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{shareResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFiles.length > 0 && (
              <span>
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSharing}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {shareResult?.success ? 'Close' : 'Cancel'}
            </button>
            
            {!shareResult?.success && (
              <button
                onClick={handleShare}
                disabled={isSharing || selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isSharing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isSharing ? 'Sharing...' : 'Share Files'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileShareModal;
