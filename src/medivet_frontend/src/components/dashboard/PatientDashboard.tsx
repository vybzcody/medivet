import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Share2, Copy, Check, Users, Shield, Clock, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import AddRecordModal from './AddRecordModal';
import ShareRecordModal from './ShareRecordModal';
import ProfilePermissions from '../ProfilePermissions';
import AccessLogsPanel from '../AccessLogsPanel';
import { HealthRecord } from '../../types';
import { usePolling } from '../../hooks/usePolling';

const PatientDashboard: React.FC = () => {
  const { principal, logout } = useAuthStore();
  const { patientProfile, fetchPatientProfile, isLoading: profileLoading } = useProfileStore();
  const { 
    records, 
    fetchRecords, 
    isLoading: recordsLoading 
  } = useHealthRecordStore();
  
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [principalCopied, setPrincipalCopied] = useState(false);

  // Add polling support
  const { refresh, isRefreshing } = usePolling({
    healthRecordsInterval: 30000, // 30 seconds
    enableHealthRecords: true,
    enableAccessLogs: true,
    enableOnFocus: true,
    enableOnVisibility: true
  });

  useEffect(() => {
    if (principal) {
      fetchPatientProfile();
      fetchRecords();
    }
  }, [principal, fetchPatientProfile, fetchRecords]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleOpenAddRecord = () => {
    setShowAddRecordModal(true);
  };

  const handleCloseAddRecord = () => {
    setShowAddRecordModal(false);
    // Refresh records after adding a new one
    fetchRecords();
  };

  const handleOpenShareModal = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedRecord(null);
  };

  const handleCopyPrincipal = async () => {
    if (!principal) {
      console.error('No principal available to copy');
      return;
    }

    const principalText = principal.toString();
    console.log('Attempting to copy principal:', principalText);
    
    let copySuccess = false;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(principalText);
        copySuccess = true;
        console.log('Successfully copied via clipboard API');
      }
    } catch (error) {
      console.log('Clipboard API failed, trying fallback:', error);
    }
    
    // Fallback method if clipboard API failed
    if (!copySuccess) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = principalText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          copySuccess = true;
          console.log('Successfully copied via fallback method');
        } else {
          console.log('Fallback copy method failed');
        }
      } catch (error) {
        console.error('Fallback copy failed:', error);
      }
    }
    
    if (copySuccess) {
      // Show success feedback
      setPrincipalCopied(true);
      setTimeout(() => setPrincipalCopied(false), 2000);
    } else {
      // Show manual copy option
      const userWantsToCopy = window.confirm(
        `Automatic copy failed. Would you like to see the principal ID to copy manually?\n\nPrincipal ID: ${principalText}`
      );
      if (userWantsToCopy) {
        // Still show success animation even for manual copy
        setPrincipalCopied(true);
        setTimeout(() => setPrincipalCopied(false), 2000);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patient Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {profileLoading ? 'Loading...' : patientProfile?.full_name || 'Patient'}
          </p>
          {principal && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Principal ID:</span>
                <span className="ml-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {principal.toString().slice(0, 20)}...{principal.toString().slice(-8)}
                </span>
              </div>
              <button
                onClick={handleCopyPrincipal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy full principal ID"
              >
                {principalCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Health Records</h2>
              {records.length > 0 && (
                <button 
                  onClick={handleOpenAddRecord}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Add Record
                </button>
              )}
            </div>
            {recordsLoading ? (
              <p>Loading records...</p>
            ) : records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{record.title}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(Number(record.record_date) / 1000000).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Provider: {record.provider} | Category: {record.category}
                        </p>
                        {/* Permission Information */}
                        {record.user_permissions && record.user_permissions.length > 0 && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Shared with {record.user_permissions.length} user{record.user_permissions.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex space-x-1">
                              {record.user_permissions.slice(0, 3).map((permission, index) => (
                                <div
                                  key={index}
                                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center space-x-1"
                                  title={`${permission.user} - ${permission.permissions.length} permission${permission.permissions.length !== 1 ? 's' : ''}${permission.expires_at ? ` (expires ${new Date(Number(permission.expires_at) / 1000000).toLocaleDateString()})` : ''}`}
                                >
                                  <Shield className="h-3 w-3" />
                                  <span>
                                    {permission.user.slice(0, 8)}...{permission.user.slice(-4)}
                                  </span>
                                </div>
                              ))}
                              {record.user_permissions.length > 3 && (
                                <span className="text-xs text-gray-400">+{record.user_permissions.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenShareModal(record)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Share record"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {record.record_type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have any health records yet.</p>
                <button 
                  onClick={handleOpenAddRecord}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create New Record
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
            {profileLoading ? (
              <p>Loading profile...</p>
            ) : patientProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{patientProfile.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{patientProfile.date_of_birth}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Information</p>
                  <p className="font-medium">{patientProfile.contact_info}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emergency Contact</p>
                  <p className="font-medium">{patientProfile.emergency_contact}</p>
                </div>
                {patientProfile.allergies && (
                  <div>
                    <p className="text-sm text-gray-500">Allergies</p>
                    <p className="font-medium">{patientProfile.allergies}</p>
                  </div>
                )}
                <button className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm">
                  Edit Profile
                </button>
              </div>
            ) : (
              <p>No profile information available.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={handleOpenAddRecord}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Record
              </button>
              <button 
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                onClick={() => records.length > 0 && handleOpenShareModal(records[0])}
                disabled={records.length === 0}
              >
                <Share2 className="h-4 w-4 mr-2" /> Share Records
              </button>
              <Link 
                to="/access-logs"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <Activity className="h-4 w-4 mr-2" /> View Access Logs
              </Link>
            </div>
          </div>
          
          {/* Profile Permissions */}
          <div className="mt-6">
            <ProfilePermissions />
          </div>
          
          {/* Recent Access Activity */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Access Activity</h2>
              <Link 
                to="/access-logs"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                View All <Clock className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Record Modal */}
      <AddRecordModal 
        isOpen={showAddRecordModal} 
        onClose={handleCloseAddRecord} 
      />
      
      {/* Share Record Modal */}
      <ShareRecordModal 
        isOpen={showShareModal}
        onClose={handleCloseShareModal}
        record={selectedRecord}
      />
      <AccessLogsPanel />
    </div>
  );
};

export default PatientDashboard;
