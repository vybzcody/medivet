import React from 'react';
import { format } from 'date-fns';
import { Clock, Eye, Plus, Edit, Trash, UserPlus, UserMinus } from 'lucide-react';

// Define the AccessLog type based on backend
export type AccessLog = {
  id: number;
  record_id: number;
  user: string;
  timestamp: bigint;
  action: string;
  success: boolean;
};

// Helper function to format action types
const formatAction = (action: string): { label: string; icon: React.ReactNode } => {
  switch (action) {
    case 'View':
      return { label: 'Viewed', icon: <Eye className="h-4 w-4" /> };
    case 'Create':
      return { label: 'Created', icon: <Plus className="h-4 w-4" /> };
    case 'Update':
      return { label: 'Updated', icon: <Edit className="h-4 w-4" /> };
    case 'Delete':
      return { label: 'Deleted', icon: <Trash className="h-4 w-4" /> };
    case 'GrantAccess':
      return { label: 'Granted Access', icon: <UserPlus className="h-4 w-4" /> };
    case 'RevokeAccess':
      return { label: 'Revoked Access', icon: <UserMinus className="h-4 w-4" /> };
    default:
      return { label: action, icon: <Clock className="h-4 w-4" /> };
  }
};

// Helper function to format principal ID
const formatPrincipal = (principal: string): string => {
  if (principal.length <= 10) return principal;
  return `${principal.substring(0, 5)}...${principal.substring(principal.length - 5)}`;
};

interface AccessLogItemProps {
  log: AccessLog;
  showRecordId?: boolean;
}

const AccessLogItem: React.FC<AccessLogItemProps> = ({ log, showRecordId = false }) => {
  // Convert bigint timestamp to Date with proper validation
  const formatTimestamp = (timestamp: bigint): string => {
    try {
      let timestampMs = Number(timestamp);
      
      // Handle nanoseconds (convert to milliseconds)
      if (timestampMs > 1000000000000000) {
        // This looks like nanoseconds, convert to milliseconds
        timestampMs = timestampMs / 1000000;
      } else if (timestampMs < 1000000000000) {
        // This looks like seconds, convert to milliseconds
        timestampMs = timestampMs * 1000;
      }
      
      // Validate the timestamp
      if (isNaN(timestampMs) || timestampMs <= 0) {
        return 'Invalid date';
      }
      
      const date = new Date(timestampMs);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'timestamp:', timestamp);
      return 'Invalid date';
    }
  };
  
  const formattedDate = formatTimestamp(log.timestamp);
  
  const { label, icon } = formatAction(log.action);
  
  return (
    <div className={`flex items-center p-3 border-b border-gray-100 ${!log.success ? 'bg-red-50' : ''}`}>
      <div className="mr-3 bg-blue-100 p-2 rounded-full">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <p className="text-sm font-medium">
            {label} {showRecordId && <span className="text-gray-500">Record #{log.record_id}</span>}
          </p>
          <span className="text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formattedDate}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          User: {formatPrincipal(log.user)}
        </p>
      </div>
      {!log.success && (
        <span className="text-xs font-medium text-red-600 ml-2">Failed</span>
      )}
    </div>
  );
};

export default AccessLogItem;
