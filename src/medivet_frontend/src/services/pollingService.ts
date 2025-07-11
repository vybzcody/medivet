// src/medivet_frontend/src/services/pollingService.ts
import useHealthRecordStore from '../stores/useHealthRecordStore';
import useAuthStore from '../stores/useAuthStore';

interface PollingConfig {
  interval: number; // in milliseconds
  enabled: boolean;
}

class PollingService {
  private static instance: PollingService;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private config: PollingConfig = {
    interval: 30000, // 30 seconds default
    enabled: false
  };

  private constructor() {}

  static getInstance(): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService();
    }
    return PollingService.instance;
  }

  /**
   * Start polling for health records
   */
  startHealthRecordsPolling(interval: number = 30000): void {
    this.stopPolling('healthRecords');
    
    const pollHealthRecords = async () => {
      try {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          console.log('User not authenticated, stopping health records polling');
          this.stopPolling('healthRecords');
          return;
        }

        const { fetchRecords, fetchSharedRecords } = useHealthRecordStore.getState();
        
        // Fetch both patient records and shared records
        await Promise.all([
          fetchRecords().catch(err => console.warn('Failed to fetch records:', err)),
          fetchSharedRecords().catch(err => console.warn('Failed to fetch shared records:', err))
        ]);
        
        console.log('Health records polling: Data refreshed');
      } catch (error) {
        console.error('Error during health records polling:', error);
      }
    };

    // Initial fetch
    pollHealthRecords();
    
    // Set up interval
    const intervalId = setInterval(pollHealthRecords, interval);
    this.intervals.set('healthRecords', intervalId);
    
    console.log(`Started health records polling with ${interval}ms interval`);
  }

  /**
   * Start polling for access logs
   */
  startAccessLogsPolling(interval: number = 60000): void {
    this.stopPolling('accessLogs');
    
    const pollAccessLogs = async () => {
      try {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          console.log('User not authenticated, stopping access logs polling');
          this.stopPolling('accessLogs');
          return;
        }

        // Trigger a refresh of access logs by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refreshAccessLogs'));
        
        console.log('Access logs polling: Refresh triggered');
      } catch (error) {
        console.error('Error during access logs polling:', error);
      }
    };

    // Set up interval (access logs don't need to be refreshed as frequently)
    const intervalId = setInterval(pollAccessLogs, interval);
    this.intervals.set('accessLogs', intervalId);
    
    console.log(`Started access logs polling with ${interval}ms interval`);
  }

  /**
   * Stop specific polling
   */
  stopPolling(key: string): void {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
      console.log(`Stopped ${key} polling`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.intervals.forEach((intervalId, key) => {
      clearInterval(intervalId);
      console.log(`Stopped ${key} polling`);
    });
    this.intervals.clear();
  }

  /**
   * Update polling configuration
   */
  updateConfig(config: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current polling status
   */
  getStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.intervals.forEach((_, key) => {
      status[key] = true;
    });
    return status;
  }

  /**
   * Manual refresh trigger
   */
  async triggerManualRefresh(): Promise<void> {
    try {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        console.warn('User not authenticated, cannot refresh data');
        return;
      }

      const { fetchRecords, fetchSharedRecordsWithoutDecryption } = useHealthRecordStore.getState();
      
      console.log('Triggering manual refresh...');
      await Promise.all([
        fetchRecords(),
        fetchSharedRecordsWithoutDecryption()
      ]);
      
      // Dispatch events for components that need to know about the refresh
      window.dispatchEvent(new CustomEvent('refreshHealthRecords'));
      window.dispatchEvent(new CustomEvent('refreshAccessLogs'));
      
      console.log('Manual refresh completed');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      throw error;
    }
  }
}

export default PollingService;
