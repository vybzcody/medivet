import React, { useEffect, useState } from 'react';
import { X, User, Calendar, Phone, AlertTriangle, Pill, FileText, Shield, Clock, Share2 } from 'lucide-react';
import { PatientProfile, UserPermission, PermissionType } from '../../types';
import useProfileStore from '../../stores/useProfileStore';
import useAuthStore from '../../stores/useAuthStore';
import useFileStore from '../../stores/useFileStore';
import { useToast } from '../../hooks/useToast';
import ShareProfileModal from './ShareProfileModal';

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientPrincipal: string;
  userPermissions: UserPermission[];
}

const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  isOpen,
  onClose,
  patientPrincipal,
  userPermissions
}) => {
  const { patientProfiles, fetchPatientProfile } = useProfileStore();
  const { identity } = useAuthStore();
  const { loadProfilePhoto, profilePhotoUrl } = useFileStore();
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [patientPhotoUrl, setPatientPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (isOpen && patientPrincipal) {
      setLoading(true);
      // Load both profile data and profile photo
      Promise.all([
        fetchPatientProfile(patientPrincipal),
        loadProfilePhoto(patientPrincipal).catch(() => null) // Don't fail if no photo
      ])
        .then(() => {
          const profile = patientProfiles.find(p => p.owner === patientPrincipal);
          setPatientProfile(profile || null);
          // The profile photo will be in the profilePhotoUrl from useFileStore
          setPatientPhotoUrl(profilePhotoUrl);
        })
        .catch(error => {
          console.error('Failed to fetch patient profile:', error);
          setPatientProfile(null);
          setPatientPhotoUrl(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, patientPrincipal, fetchPatientProfile, patientProfiles, loadProfilePhoto, profilePhotoUrl]);

  const { showError, showInfo } = useToast();

  // Check if current user is the owner of this profile
  const isProfileOwner = identity?.getPrincipal().toString() === patientPrincipal;

  // IMPORTANT: Current Permission Architecture
  // The backend only supports permissions on health records, not patient profiles.
  // We're using health record permissions as a proxy for patient profile access:
  // - If provider has ANY active permissions on patient's records, they can view basic info
  // - For specific data (medical history, allergies, medications), we check for those specific permissions
  // TODO: Implement dedicated patient profile permission system in the future

  // Check if provider has any active permissions (from any health record)
  const hasAnyActivePermissions = (): boolean => {
    return userPermissions.some(permission => 
      permission.permissions.length > 0 &&
      (!permission.expires_at || new Date(Number(permission.expires_at) / 1000000) > new Date())
    );
  };

  // For patient profile access, we'll use a more permissive approach:
  // If provider has any permissions on patient's health records, they can view basic info
  const hasPermission = (permissionType: PermissionType): boolean => {
    // If no permissions at all, deny access
    if (!hasAnyActivePermissions()) {
      return false;
    }

    // For basic info, allow if provider has any active permissions
    if (permissionType === PermissionType.READ_BASIC_INFO) {
      return hasAnyActivePermissions();
    }

    // For other data types, check specific permissions
    return userPermissions.some(permission => 
      permission.permissions.includes(permissionType) &&
      (!permission.expires_at || new Date(Number(permission.expires_at) / 1000000) > new Date())
    );
  };

  const getPermissionStatus = (permissionType: PermissionType) => {
    // For basic info, check if provider has any active permissions
    if (permissionType === PermissionType.READ_BASIC_INFO) {
      if (hasAnyActivePermissions()) {
        return { hasAccess: true, status: 'Active' };
      } else {
        return { hasAccess: false, status: 'No Access' };
      }
    }

    // For other permission types, check specific permissions
    const permission = userPermissions.find(p => p.permissions.includes(permissionType));
    if (!permission) return { hasAccess: false, status: 'No Access' };
    
    // Handle nanoseconds to milliseconds conversion for IC timestamps
    const isExpired = permission.expires_at && new Date(Number(permission.expires_at) / 1000000) <= new Date();
    if (isExpired) return { hasAccess: false, status: 'Expired' };
    
    return { hasAccess: true, status: 'Active' };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatPermissionExpiry = (expiryTime: bigint | null) => {
    if (!expiryTime) return 'No expiry';
    try {
      // Convert nanoseconds to milliseconds for IC timestamps
      const dateMs = Number(expiryTime) / 1000000;
      const date = new Date(dateMs);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Patient Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading patient profile...</span>
            </div>
          ) : patientProfile ? (
            <div className="space-y-6">
              {/* Profile Photo Section */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {patientPhotoUrl ? (
                    <img
                      src={patientPhotoUrl}
                      alt={`${patientProfile.full_name}'s profile`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{patientProfile.full_name}</h2>
                <p className="text-gray-600 text-sm mt-1">Patient Profile</p>
              </div>

              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-500" size={20} />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <PermissionBadge status={getPermissionStatus(PermissionType.READ_BASIC_INFO)} />
                </div>
                
                {hasPermission(PermissionType.READ_BASIC_INFO) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Full Name</label>
                      <p className="text-gray-900">{patientProfile.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                      <p className="text-gray-900">{formatDate(patientProfile.date_of_birth)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Contact Information</label>
                      <p className="text-gray-900">{patientProfile.contact_info}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Emergency Contact</label>
                      <p className="text-gray-900">{patientProfile.emergency_contact}</p>
                    </div>
                  </div>
                ) : (
                  <RestrictedAccess message="You don't have permission to view basic patient information." />
                )}
              </div>

              {/* Medical History Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-green-500" size={20} />
                  <h3 className="text-lg font-semibold">Medical History</h3>
                  <PermissionBadge status={getPermissionStatus(PermissionType.READ_MEDICAL_HISTORY)} />
                </div>
                
                {hasPermission(PermissionType.READ_MEDICAL_HISTORY) ? (
                  <div>
                    {patientProfile.medical_history ? (
                      <p className="text-gray-900 whitespace-pre-wrap">{patientProfile.medical_history}</p>
                    ) : (
                      <p className="text-gray-500 italic">No medical history recorded</p>
                    )}
                  </div>
                ) : (
                  <RestrictedAccess message="You don't have permission to view medical history." />
                )}
              </div>

              {/* Allergies Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-red-500" size={20} />
                  <h3 className="text-lg font-semibold">Allergies</h3>
                  <PermissionBadge status={getPermissionStatus(PermissionType.READ_ALLERGIES)} />
                </div>
                
                {hasPermission(PermissionType.READ_ALLERGIES) ? (
                  <div>
                    {patientProfile.allergies ? (
                      <p className="text-gray-900">{patientProfile.allergies}</p>
                    ) : (
                      <p className="text-gray-500 italic">No known allergies</p>
                    )}
                  </div>
                ) : (
                  <RestrictedAccess message="You don't have permission to view allergy information." />
                )}
              </div>

              {/* Current Medications Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="text-purple-500" size={20} />
                  <h3 className="text-lg font-semibold">Current Medications</h3>
                  <PermissionBadge status={getPermissionStatus(PermissionType.READ_MEDICATIONS)} />
                </div>
                
                {hasPermission(PermissionType.READ_MEDICATIONS) ? (
                  <div>
                    {patientProfile.current_medications ? (
                      <p className="text-gray-900">{patientProfile.current_medications}</p>
                    ) : (
                      <p className="text-gray-500 italic">No current medications</p>
                    )}
                  </div>
                ) : (
                  <RestrictedAccess message="You don't have permission to view medication information." />
                )}
              </div>

              {/* Permission Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="text-blue-500" size={20} />
                  <h3 className="text-lg font-semibold">Your Access Permissions</h3>
                </div>
                
                <div className="space-y-2">
                  {userPermissions.map((permission, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <p className="font-medium text-gray-900">
                          {permission.permissions.length} permission(s) granted
                        </p>
                        <p className="text-sm text-gray-600">
                          Granted by: {permission.granted_by}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={14} />
                          <span>Expires: {formatPermissionExpiry(permission.expires_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {userPermissions.length === 0 && (
                    <p className="text-gray-500 italic">No active permissions</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Failed to load patient profile or no profile found.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          {/* Share Profile Button - Only show if user is the profile owner */}
          {isProfileOwner && patientProfile && (
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Profile</span>
            </button>
          )}
          
          {/* Spacer if not profile owner */}
          {!isProfileOwner && <div />}
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
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

// Helper Components
const PermissionBadge: React.FC<{ status: { hasAccess: boolean; status: string } }> = ({ status }) => (
  <span className={`px-2 py-1 text-xs rounded-full ${
    status.hasAccess 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }`}>
    {status.status}
  </span>
);

const RestrictedAccess: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
    <Shield className="text-red-500" size={20} />
    <p className="text-red-700">{message}</p>
  </div>
);

export default PatientProfileModal;
