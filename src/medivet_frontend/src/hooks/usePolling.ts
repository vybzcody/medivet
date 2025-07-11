// src/medivet_frontend/src/hooks/usePolling.ts
import { useEffect, useCallback, useState } from 'react';
import PollingService from '../services/pollingService';
import useAuthStore from '../stores/useAuthStore';

interface UsePollingOptions {
  healthRecordsInterval?: number;
  accessLogsInterval?: number;
  enableHealthRecords?: boolean;
  enableAccessLogs?: boolean;
  enableOnFocus?: boolean; // Refresh when window gains focus
  enableOnVisibility?: boolean; // Refresh when tab becomes visible
}

export const usePolling = (options: UsePollingOptions = {}) => {
  const {
    healthRecordsInterval = 30000, // 30 seconds
    accessLogsInterval = 60000, // 1 minute
    enableHealthRecords = true,
    enableAccessLogs = true,
    enableOnFocus = true,
    enableOnVisibility = true
  } = options;

  const { isAuthenticated } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollingService = PollingService.getInstance();

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsRefreshing(true);
    try {
      await pollingService.triggerManualRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, pollingService]);

  // Start/stop polling based on authentication status
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Starting polling services...');
      
      if (enableHealthRecords) {
        pollingService.startHealthRecordsPolling(healthRecordsInterval);
      }
      
      if (enableAccessLogs) {
        pollingService.startAccessLogsPolling(accessLogsInterval);
      }
    } else {
      console.log('Stopping polling services...');
      pollingService.stopAllPolling();
    }

    // Cleanup on unmount
    return () => {
      pollingService.stopAllPolling();
    };
  }, [isAuthenticated, enableHealthRecords, enableAccessLogs, healthRecordsInterval, accessLogsInterval]);

  // Handle window focus events
  useEffect(() => {
    if (!enableOnFocus || !isAuthenticated) return;

    const handleFocus = () => {
      console.log('Window focused, refreshing data...');
      refresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enableOnFocus, isAuthenticated, refresh]);

  // Handle page visibility changes
  useEffect(() => {
    if (!enableOnVisibility || !isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing data...');
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableOnVisibility, isAuthenticated, refresh]);

  // Get polling status
  const getPollingStatus = useCallback(() => {
    return pollingService.getStatus();
  }, [pollingService]);

  return {
    refresh,
    isRefreshing,
    getPollingStatus,
    stopPolling: (key: string) => pollingService.stopPolling(key),
    stopAllPolling: () => pollingService.stopAllPolling()
  };
};
