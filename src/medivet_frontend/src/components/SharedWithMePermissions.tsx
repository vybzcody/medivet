import React, { useState, useEffect } from 'react';
import { Shield, User, Calendar, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { ProfilePermission, PermissionType } from '../types';
import useProfileStore from '../stores/useProfileStore';
import { useToast } from '../hooks/useToast';

interface SharedPatientData {
  patientPrincipal: string;
  permissions: ProfilePermission[];
}

const SharedWithMePermissions: React.FC = () => {
  const [sharedData, setSharedData] = useState<SharedPatientData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getPermissionsGrantedToMe } = useProfileStore();
  const { showError } = useToast();

  const fetchSharedPermissions = async () => {
    setIsLoading(true);
    try {
      const permissionsData = await getPermissionsGrantedToMe();
      setSharedData(permissionsData);
    } catch (error: any) {
      console.error('Error fetching shared permissions:', error);
      showError('Error', `Failed to load shared permissions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedPermissions();
  }, []);

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

  const getPatientDisplayName = (patientPrincipal: string): string => {
    // For now, just show a shortened version of the principal
    // In a real app, you might want to fetch the patient's name
    return `Patient ${patientPrincipal.slice(0, 8)}...`;
  };

  const getTotalPermissionsCount = (): number => {
    return sharedData.reduce((total, patient) => total + patient.permissions.length, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Shared With Me</h2>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            {getTotalPermissionsCount()} permission(s)
          </span>
        </div>
        <button
          onClick={fetchSharedPermissions}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
          <span className="ml-2 text-gray-600">Loading shared permissions...</span>
        </div>
      ) : sharedData.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Shared Permissions</h3>
          <p className="text-gray-600">
            No patients have shared their profiles with you yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sharedData.map((patientData, patientIndex) => (
            <div key={patientIndex} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">
                  {getPatientDisplayName(patientData.patientPrincipal)}
                </h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {patientData.permissions.length} permission(s)
                </span>
              </div>
              
              <div className="space-y-3">
                {patientData.permissions.map((permission, permIndex) => (
                  <div
                    key={permIndex}
                    className={`border rounded-lg p-3 ${
                      isExpired(permission.expires_at) 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">
                            Granted by: {permission.granted_by}
                          </span>
                          {isExpired(permission.expires_at) && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center space-x-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>Expired</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Access to:</h4>
                          <div className="flex flex-wrap gap-2">
                            {permission.permissions.map((perm, permTypeIndex) => (
                              <span
                                key={permTypeIndex}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedWithMePermissions;
