import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import AccessLogsList from '../components/access/AccessLogsList';
import  useAuthStore  from '../stores/useAuthStore';

const AccessLogsPage: React.FC = () => {
  const { recordId } = useParams<{ recordId?: string }>();
  const [filterType, setFilterType] = useState<string>('all');
  const navigate = useNavigate();
  const { userRole } = useAuthStore();
  
  // Convert recordId to number if provided
  const recordIdNum = recordId ? parseInt(recordId) : undefined;
  
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button 
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">
          {recordIdNum 
            ? `Access Logs for Record #${recordIdNum}` 
            : 'Access Audit Trail'}
        </h1>
      </div>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <p className="text-gray-600 mb-4 md:mb-0">
          {recordIdNum 
            ? 'View all access events for this specific health record' 
            : 'View all your access activities and events'}
        </p>
        
        <div className="flex items-center">
          <Filter className="h-4 w-4 mr-2 text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="View">View Only</option>
            <option value="Create">Create Only</option>
            <option value="Update">Update Only</option>
            <option value="GrantAccess">Access Grants</option>
            <option value="RevokeAccess">Access Revocations</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <AccessLogsList 
          recordId={recordIdNum} 
          maxItems={100} // Show more logs on the dedicated page
        />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-lg font-medium text-blue-800 mb-2">About Access Logs</h3>
        <p className="text-sm text-blue-700">
          {userRole === 'PATIENT' 
            ? 'Access logs show who has viewed, modified, or been granted access to your health records. This helps you monitor and ensure the privacy of your medical information.'
            : 'Access logs track your interactions with patient records. These logs are also visible to patients, ensuring transparency in healthcare data access.'}
        </p>
      </div>
    </div>
  );
};

export default AccessLogsPage;
