import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import AccessLogItem, { AccessLog } from './AccessLogItem';
import { createAuthenticatedActor } from '../../services/actorService';
import useAuthStore from '../../stores/useAuthStore';

interface AccessLogsListProps {
  recordId?: number; // Optional: if provided, shows logs for a specific record
  maxItems?: number; // Optional: limit the number of items shown
}

const AccessLogsList: React.FC<AccessLogsListProps> = ({ recordId, maxItems = 10 }) => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { identity } = useAuthStore();

  const fetchAccessLogs = useCallback(async () => {
    const { identity } = useAuthStore.getState();
    if (!identity) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Create authenticated actor and cast it to include our expected methods
      const actor = createAuthenticatedActor(identity) as any;
      
      let fetchedLogs: AccessLog[];
      if (recordId !== undefined) {
        // Fetch logs for a specific record
        try {
          // Call backend API to get record access logs
          if (typeof actor.get_record_access_logs === 'function') {
            fetchedLogs = await actor.get_record_access_logs(BigInt(recordId));
          } else {
            console.warn('Backend method get_record_access_logs is not available');
            fetchedLogs = [];
          }
        } catch (err) {
          console.error('Failed to fetch record access logs:', err);
          setError('Failed to load record access logs. Please try again.');
          fetchedLogs = [];
        }
      } else {
        // Fetch logs for the current user
        // Call backend API to get user access logs
        try {
          if (typeof actor.get_user_access_logs === 'function') {
            fetchedLogs = await actor.get_user_access_logs();
          } else {
            console.warn('Backend method get_user_access_logs is not available');
            fetchedLogs = [];
          }
        } catch (err) {
          console.error('Failed to fetch user access logs:', err);
          setError('Failed to load user access logs. Please try again.');
          fetchedLogs = [];
        }
      }

      // Sort logs by timestamp (newest first)
      const sortedLogs = fetchedLogs.sort((a, b) => {
        const timeA = Number(a.timestamp);
        const timeB = Number(b.timestamp);
        return timeB - timeA;
      });

      // Apply maxItems limit if specified
      const finalLogs = maxItems ? sortedLogs.slice(0, maxItems) : sortedLogs;
      
      setLogs(finalLogs);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      setError('Failed to load access logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [recordId, maxItems]);

  useEffect(() => {
    fetchAccessLogs();
  }, [fetchAccessLogs]);

  // Listen for refresh events from polling service
  useEffect(() => {
    const handleRefresh = () => {
      console.log('AccessLogsList: Received refresh event');
      fetchAccessLogs();
    };

    window.addEventListener('refreshAccessLogs', handleRefresh);
    return () => window.removeEventListener('refreshAccessLogs', handleRefresh);
  }, [fetchAccessLogs]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No access logs found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium">
          {recordId !== undefined ? `Access Logs for Record #${recordId}` : 'Your Access Logs'}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {logs.map((log) => (
          <AccessLogItem 
            key={log.id} 
            log={log} 
            showRecordId={recordId === undefined}
          />
        ))}
      </div>
      {logs.length >= maxItems && (
        <div className="p-3 text-center">
          <button 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => {/* Implement view more functionality */}}
          >
            View more
          </button>
        </div>
      )}
    </div>
  );
};

export default AccessLogsList;
