import React, { useEffect, useState } from 'react';
import { LogOut, Copy, Check, Clock, Activity, FileText, Users, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';

import EncryptedRecordCard from '../records/EncryptedRecordCard';
import AccessLogsPanel from '../AccessLogsPanel';
import { usePolling } from '../../hooks/usePolling';
import AccessLogsList from '../access/AccessLogsList';

const ProviderDashboard: React.FC = () => {
  const { principal, logout } = useAuthStore();
  const { healthcareProviderProfile, fetchHealthcareProviderProfile, isLoading: profileLoading } = useProfileStore();
  const {
    sharedRecords,
    isLoading,
    error,
    fetchSharedRecordsWithoutDecryption
  } = useHealthRecordStore();
  
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
      fetchHealthcareProviderProfile();
      fetchSharedRecordsWithoutDecryption();
    }
  }, [principal, fetchHealthcareProviderProfile, fetchSharedRecordsWithoutDecryption]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
          <h1 className="text-2xl font-bold text-gray-800">Healthcare Provider Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {profileLoading ? 'Loading...' : healthcareProviderProfile?.full_name || 'Provider'}
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Shared Health Records
            </h2>
            {sharedRecords.length === 0 ? (
              <p className="text-gray-500">No shared records available.</p>
            ) : (
              <div className="space-y-6">
                {sharedRecords.map((record) => (
                  <EncryptedRecordCard 
                    key={record.id} 
                    record={record} 
                    onAccessLogged={() => {
                      // Trigger access logs refresh when provider views a record
                      window.dispatchEvent(new CustomEvent('refreshAccessLogs'));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Provider Information</h2>
            {profileLoading ? (
              <p>Loading profile...</p>
            ) : healthcareProviderProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{healthcareProviderProfile.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Specialization</p>
                  <p className="font-medium">{healthcareProviderProfile.specialization}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">License Number</p>
                  <p className="font-medium">{healthcareProviderProfile.license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Information</p>
                  <p className="font-medium">{healthcareProviderProfile.contact_info}</p>
                </div>
                {healthcareProviderProfile.facility_name && (
                  <div>
                    <p className="text-sm text-gray-500">Facility</p>
                    <p className="font-medium">{healthcareProviderProfile.facility_name}</p>
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
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" /> Request Record Access
              </button>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center">
                <Users className="h-4 w-4 mr-2" /> View Patient List
              </button>
              <Link 
                to="/access-logs"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <Activity className="h-4 w-4 mr-2" /> Access Audit Logs
              </Link>
            </div>
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
            <AccessLogsList maxItems={3} />
          </div>
        </div>
      </div>
      <AccessLogsPanel />
    </div>
  );
};

export default ProviderDashboard;
