import React, { useState, useEffect } from 'react';
import { X, Share2, Edit3, Calendar, User, Shield } from 'lucide-react';
import { PermissionType, ProfilePermission } from '../../types';
import useProfileStore from '../../stores/useProfileStore';
import { useToast } from '../../hooks/useToast';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
}

const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  isOpen,
  onClose,
  patientName
}) => {
  const [userPrincipal, setUserPrincipal] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  const [permissionMode, setPermissionMode] = useState<'quick' | 'custom'>('quick');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingPermission, setExistingPermission] = useState<ProfilePermission | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  const { grantProfilePermission, getProfilePermissions } = useProfileStore();
  const { showSuccess, showError, showWarning } = useToast();

  // Quick permission options
  const quickPermissions = [
    {
      label: 'Basic Info Only',
      permissions: [PermissionType.READ_BASIC_INFO],
      description: 'Name, date of birth, and contact information'
    },
    {
      label: 'Medical History',
      permissions: [PermissionType.READ_BASIC_INFO, PermissionType.READ_MEDICAL_HISTORY],
      description: 'Basic info plus medical history'
    },
    {
      label: 'Full Medical Profile',
      permissions: [
        PermissionType.READ_BASIC_INFO,
        PermissionType.READ_MEDICAL_HISTORY,
        PermissionType.READ_ALLERGIES,
        PermissionType.READ_MEDICATIONS
      ],
      description: 'Complete access to all profile information'
    }
  ];

  // Check for existing permissions when user principal changes
  useEffect(() => {
    const checkExistingPermissions = async () => {
      if (userPrincipal.trim()) {
        try {
          const permissions = await getProfilePermissions();
          const existing = permissions.find(p => p.user === userPrincipal);
          
          if (existing) {
            setExistingPermission(existing);
            setIsUpdateMode(true);
            setSelectedPermissions(existing.permissions);
            setPermissionMode('custom');
            
            // Set expiry date if it exists
            if (existing.expires_at) {
              const expiryDate = new Date(Number(existing.expires_at) / 1000000);
              setExpiryDate(expiryDate.toISOString().split('T')[0]);
            }
            
            showWarning(
              'Existing Permissions Found',
              `${userPrincipal} already has permissions for this profile. You can update them below.`,
              5000
            );
          } else {
            setExistingPermission(null);
            setIsUpdateMode(false);
          }
        } catch (error) {
          console.error('Error checking existing permissions:', error);
        }
      }
    };

    checkExistingPermissions();
  }, [userPrincipal, getProfilePermissions]);

  const handlePermissionToggle = (permission: PermissionType) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleQuickPermissionSelect = (permissions: PermissionType[]) => {
    setSelectedPermissions(permissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userPrincipal.trim()) {
      showError(
        'Error',
        'Please enter a user principal',
        5000
      );
      return;
    }

    if (selectedPermissions.length === 0) {
      showError(
        'Error',
        'Please select at least one permission',
        5000
      );
      return;
    }

    setIsLoading(true);
    
    try {
      await grantProfilePermission(
        userPrincipal.trim(),
        selectedPermissions,
        expiryDate || undefined
      );

      const action = isUpdateMode ? 'updated' : 'granted';
      showSuccess(
        'Success',
        `Profile permissions ${isUpdateMode ? 'updated' : 'granted'} successfully! ${selectedPermissions.length} permission(s) ${isUpdateMode ? 'updated' : 'granted'}.`,
        4000
      );

      handleClose();
    } catch (error: any) {
      console.error('Error managing profile permissions:', error);
      
      const errorMessage = error.message?.includes('delegation') || error.message?.includes('expired')
        ? 'Session expired. Please refresh the page and try again.'
        : `Failed to ${isUpdateMode ? 'update' : 'grant'} profile permissions: ${error.message}`;
      
      showError(
        'Error',
        errorMessage,
        error.message?.includes('delegation') ? 10000 : 5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUserPrincipal('');
    setSelectedPermissions([]);
    setPermissionMode('quick');
    setExpiryDate('');
    setExistingPermission(null);
    setIsUpdateMode(false);
    onClose();
  };

  if (!isOpen) return null;

  const buttonColor = isUpdateMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700';
  const modalTitle = isUpdateMode ? 'Update Profile Permissions' : 'Share Patient Profile';
  const buttonText = isUpdateMode ? 'Update Permissions' : 'Grant Access';
  const buttonIcon = isUpdateMode ? Edit3 : Share2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            {React.createElement(buttonIcon, { className: `h-6 w-6 ${isUpdateMode ? 'text-orange-600' : 'text-blue-600'}` })}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
              <p className="text-sm text-gray-600">Patient: {patientName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Principal Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              User Principal ID
            </label>
            <input
              type="text"
              value={userPrincipal}
              onChange={(e) => setUserPrincipal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the user's principal ID"
              required
            />
            {existingPermission && (
              <p className="mt-1 text-sm text-orange-600">
                This user already has permissions. You are updating their access.
              </p>
            )}
          </div>

          {/* Permission Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Shield className="h-4 w-4 inline mr-2" />
              Permission Level
            </label>
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() => setPermissionMode('quick')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  permissionMode === 'quick'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                Quick Select
              </button>
              <button
                type="button"
                onClick={() => setPermissionMode('custom')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  permissionMode === 'custom'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                Custom Permissions
              </button>
            </div>

            {/* Quick Permission Options */}
            {permissionMode === 'quick' && (
              <div className="space-y-3">
                {quickPermissions.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleQuickPermissionSelect(option.permissions)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      JSON.stringify(selectedPermissions.sort()) === JSON.stringify(option.permissions.sort())
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900">{option.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Permission Checkboxes */}
            {permissionMode === 'custom' && (
              <div className="space-y-3">
                {Object.values(PermissionType).map((permission) => (
                  <label key={permission} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission)}
                      onChange={() => handlePermissionToggle(permission)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {permission.replace('READ_', '').replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for permanent access
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2 text-white rounded-md transition-colors flex items-center space-x-2 ${buttonColor} ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {React.createElement(buttonIcon, { className: 'h-4 w-4' })}
              <span>{isLoading ? (isUpdateMode ? 'Updating...' : 'Granting...') : buttonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareProfileModal;
