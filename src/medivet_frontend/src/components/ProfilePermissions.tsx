import React, { useState, useEffect } from 'react';
import { Shield, User, Calendar, Trash2, RefreshCw, Share2, AlertCircle } from 'lucide-react';
import { ProfilePermission, PermissionType } from '../types';
import useProfileStore from '../stores/useProfileStore';
import { useToast } from '../hooks/useToast';
import ShareProfileModal from './modals/ShareProfileModal';
import SharedWithMePermissions from './SharedWithMePermissions';

const ProfilePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<ProfilePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'granted' | 'shared'>('granted');
  
  const { getProfilePermissions, revokeProfilePermission, patientProfile } = useProfileStore();
  const { showSuccess, showError } = useToast();

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const profilePermissions = await getProfilePermissions();
      setPermissions(profilePermissions);
    } catch (error: any) {
      console.error('Error fetching profile permissions:', error);
      showError('Error', `Failed to load profile permissions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleRevokePermission = async (userPrincipal: string) => {
    if (!confirm('Are you sure you want to revoke all profile permissions for this user?')) {
      return;
    }

    try {
      await revokeProfilePermission(userPrincipal);
      showSuccess('Success', 'Profile permissions revoked successfully');
      await fetchPermissions(); // Refresh the list
    } catch (error: any) {
      console.error('Error revoking permission:', error);
      showError('Error', `Failed to revoke permissions: ${error.message}`);
    }
  };

  const formatPermissionType = (permission: PermissionType): string => {
    return permission.replace('READ_', '').replace('_', ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const isExpired = (expiresAt: string | bigint | null): boolean => {
    if (!expiresAt) return false;
    const timestamp = typeof expiresAt === 'bigint' ? Number(expiresAt) : Number(expiresAt);
    return new Date(timestamp / 1000000) < new Date();
  };

  const formatDate = (timestamp: string | bigint): string => {
    const numericTimestamp = typeof timestamp === 'bigint' ? Number(timestamp) : Number(timestamp);
    const date = new Date(numericTimestamp / 1000000);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Profile Permissions</h2>
        </div>
        {activeTab === 'granted' && (
          <div className="flex space-x-3">
            <button
              onClick={fetchPermissions}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('granted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'granted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Granted by Me
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shared'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shared with Me
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'granted' ? (
        // Granted by Me Tab Content
        isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading permissions...</span>
          </div>
        ) : permissions.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Permissions</h3>
            <p className="text-gray-600 mb-4">
              You haven't shared your profile with any healthcare providers yet.
            </p>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Your Profile</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {permissions.map((permission, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  isExpired(permission.expires_at) 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {permission.user}
                      </span>
                      {isExpired(permission.expires_at) && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>Expired</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {permission.permissions.map((perm, permIndex) => (
                          <span
                            key={permIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {formatPermissionType(perm)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Granted: {formatDate(permission.granted_at)}</span>
                      </div>
                      {permission.expires_at ? (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Expires: {formatDate(permission.expires_at)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-green-600 font-medium">Permanent</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRevokePermission(permission.user)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    title="Revoke permissions"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Shared with Me Tab Content
        <SharedWithMePermissions />
      )}

      {/* Share Profile Modal */}
      {showShareModal && patientProfile && (
        <ShareProfileModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          patientName={patientProfile.full_name}
        />
      )}
    </div>
  );
};

export default ProfilePermissions;
