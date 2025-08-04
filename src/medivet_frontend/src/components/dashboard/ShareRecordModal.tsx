import React, { useState, useEffect } from 'react';
import { X, Share2, AlertCircle, CheckCircle, Calendar, Users, Shield, UserPlus, Edit3 } from 'lucide-react';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import { useToast } from '../../hooks/useToast';
import { HealthRecord, PermissionType, PermissionPresets, UserPermission } from '../../types';

interface ShareRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: HealthRecord | null;
}

const ShareRecordModal: React.FC<ShareRecordModalProps> = ({ isOpen, onClose, record }) => {
  const [userPrincipal, setUserPrincipal] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([...PermissionPresets.VIEW_ONLY]);
  const [selectedPreset, setSelectedPreset] = useState<string>('VIEW_ONLY');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState(false);
  const [existingPermission, setExistingPermission] = useState<UserPermission | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  const { grantAccess, grantSpecificAccess } = useHealthRecordStore();
  const { showSuccess, showError, showWarning } = useToast();

  // Check for existing permissions when user principal changes
  useEffect(() => {
    if (userPrincipal.trim() && record) {
      const existing = record.user_permissions?.find(p => p.user === userPrincipal.trim());
      if (existing) {
        setExistingPermission(existing);
        setIsUpdateMode(true);

        // Pre-populate form with existing permissions
        setSelectedPermissions([...existing.permissions]);
        setCustomPermissions(true);
        setSelectedPreset('CUSTOM');

        // Set expiry date if exists
        if (existing.expires_at) {
          const expiryMs = Number(existing.expires_at) / 1000000; // Convert from nanoseconds
          const expiryDateStr = new Date(expiryMs).toISOString().split('T')[0];
          setExpiryDate(expiryDateStr);
        }

        showWarning(
          'Existing Permissions Found',
          `This user already has permissions for this record. You can update them.`,
          8000
        );
      } else {
        setExistingPermission(null);
        setIsUpdateMode(false);
        // Reset to defaults when no existing permissions
        setSelectedPermissions([...PermissionPresets.VIEW_ONLY]);
        setSelectedPreset('VIEW_ONLY');
        setCustomPermissions(false);
        setExpiryDate('');
      }
    } else {
      setExistingPermission(null);
      setIsUpdateMode(false);
    }
  }, [userPrincipal, record, showWarning]);

  // Helper functions for permission management
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setCustomPermissions(false);
    switch (preset) {
      case 'VIEW_ONLY':
        setSelectedPermissions([...PermissionPresets.VIEW_ONLY]);
        break;
      case 'FULL_ACCESS':
        setSelectedPermissions([...PermissionPresets.FULL_ACCESS]);
        break;
      case 'EMERGENCY_CONTACT':
        setSelectedPermissions([...PermissionPresets.EMERGENCY_CONTACT]);
        break;
      case 'CUSTOM':
        setCustomPermissions(true);
        break;
    }
  };

  const handlePermissionToggle = (permission: PermissionType) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!record || !userPrincipal.trim()) {
      setShareError('Please enter a valid user principal');
      return;
    }

    if (selectedPermissions.length === 0) {
      setShareError('Please select at least one permission');
      return;
    }

    setIsSharing(true);
    setShareError(null);
    setShareSuccess(false);

    try {
      // Use the new granular permission system
      await grantSpecificAccess(
        record.id,
        userPrincipal.trim(),
        selectedPermissions,
        expiryDate || undefined
      );

      // Show success toast
      const actionText = isUpdateMode ? 'updated' : 'granted';
      showSuccess(
        `Permissions ${actionText} successfully!`,
        `${userPrincipal.trim()} now has ${selectedPermissions.length} permission(s) for this record.`
      );

      // Reset form
      setUserPrincipal('');
      setSelectedPermissions([...PermissionPresets.VIEW_ONLY]);
      setSelectedPreset('VIEW_ONLY');
      setExpiryDate('');
      setCustomPermissions(false);
      setExistingPermission(null);
      setIsUpdateMode(false);

      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error sharing record:', error);

      // Show error toast with specific handling for delegation expiry
      if (error.message?.includes('delegation has expired') || error.message?.includes('Invalid delegation expiry')) {
        showError(
          'Session Expired',
          'Your session has expired. Please refresh the page and try again.',
          10000
        );
      } else {
        showError(
          `Failed to ${isUpdateMode ? 'update' : 'grant'} permissions`,
          error.message || 'An unexpected error occurred. Please try again.',
          8000
        );
      }

      setShareError(error.message || 'Failed to share record');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setUserPrincipal('');
    setShareError(null);
    setShareSuccess(false);
    setSelectedPermissions([...PermissionPresets.VIEW_ONLY]);
    setSelectedPreset('VIEW_ONLY');
    setExpiryDate('');
    setCustomPermissions(false);
    setExistingPermission(null);
    setIsUpdateMode(false);
    onClose();
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {isUpdateMode ? (
              <Edit3 className="h-5 w-5 text-orange-600" />
            ) : (
              <Share2 className="h-5 w-5 text-blue-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {isUpdateMode ? 'Update Permissions' : 'Share Health Record'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Record Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">{record.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Category: {record.category}</p>
              <p>Provider: {record.provider}</p>
              <p>Type: {record.record_type}</p>
              <p>Date: {new Date(Number(record.record_date) / 1000000).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Share Form */}
          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label htmlFor="userPrincipal" className="block text-sm font-medium text-gray-700 mb-2">
                User Principal ID
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  id="userPrincipal"
                  value={userPrincipal}
                  onChange={(e) => setUserPrincipal(e.target.value)}
                  placeholder="Enter the principal ID of the user to share with"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSharing}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The principal ID is a unique identifier for each user on the Internet Computer
              </p>
            </div>

            {/* Permission Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="inline h-4 w-4 mr-1" />
                  Access Permissions
                </label>

                {/* Permission Presets */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handlePresetChange('VIEW_ONLY')}
                    className={`p-2 text-sm rounded-md border transition-colors ${selectedPreset === 'VIEW_ONLY'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('FULL_ACCESS')}
                    className={`p-2 text-sm rounded-md border transition-colors ${selectedPreset === 'FULL_ACCESS'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('EMERGENCY_CONTACT')}
                    className={`p-2 text-sm rounded-md border transition-colors ${selectedPreset === 'EMERGENCY_CONTACT'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Emergency
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetChange('CUSTOM')}
                    className={`p-2 text-sm rounded-md border transition-colors ${selectedPreset === 'CUSTOM'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Permission Selection */}
                {customPermissions && (
                  <div className="bg-gray-50 p-3 rounded-md space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Select specific permissions:</p>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {Object.values(PermissionType).map((permission) => (
                        <label key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">
                            {permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Permissions Display */}
                {!customPermissions && selectedPermissions.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-700 mb-1">Selected permissions:</p>
                    <div className="text-xs text-blue-600 space-y-1">
                      {selectedPermissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>
                            {permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Access Expiry (Optional)
                </label>
                <input
                  type="date"
                  id="expiryDate"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSharing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for permanent access
                </p>
              </div>
            </div>

            {/* Error Message */}
            {shareError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{shareError}</p>
              </div>
            )}

            {/* Success Message */}
            {shareSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">Record shared successfully!</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSharing}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSharing || !userPrincipal.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isUpdateMode
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isSharing
                  ? (isUpdateMode ? 'Updating...' : 'Sharing...')
                  : (isUpdateMode ? 'Update Permissions' : 'Share Record')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShareRecordModal;
