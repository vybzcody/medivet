/**
 * Utility functions for handling timestamps and date formatting
 * in the MediVet application
 */

/**
 * Safely converts a timestamp from the backend to a JavaScript Date object
 * Handles nanoseconds, microseconds, and second-based timestamps
 * 
 * @param timestamp - The timestamp value (bigint or number)
 * @returns Date object or null if invalid
 */
export function safeTimestampToDate(timestamp: bigint | number | string): Date | null {
  try {
    let timestampMs: number;
    
    if (typeof timestamp === 'string') {
      timestampMs = parseInt(timestamp, 10);
    } else if (typeof timestamp === 'bigint') {
      timestampMs = Number(timestamp);
    } else {
      timestampMs = timestamp;
    }
    
    // Validate the input
    if (isNaN(timestampMs) || timestampMs <= 0) {
      console.warn('Invalid timestamp value:', timestamp);
      return null;
    }
    
    // Handle different timestamp formats
    if (timestampMs > 1000000000000000) {
      // This looks like nanoseconds (> 1e15), convert to milliseconds
      timestampMs = timestampMs / 1000000;
    } else if (timestampMs < 1000000000000) {
      // This looks like seconds (< 1e12), convert to milliseconds
      timestampMs = timestampMs * 1000;
    }
    // If between 1e12 and 1e15, assume it's already in milliseconds
    
    const date = new Date(timestampMs);
    
    // Validate the resulting date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from timestamp:', timestamp);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error converting timestamp to date:', error, 'timestamp:', timestamp);
    return null;
  }
}

/**
 * Formats a timestamp as a localized date and time string
 * 
 * @param timestamp - The timestamp value (bigint or number)
 * @param options - Formatting options
 * @returns Formatted date string or 'Invalid date' if invalid
 */
export function formatTimestamp(
  timestamp: bigint | number | string,
  options: {
    includeTime?: boolean;
    format?: 'short' | 'medium' | 'long' | 'full';
  } = {}
): string {
  const { includeTime = true, format = 'medium' } = options;
  
  const date = safeTimestampToDate(timestamp);
  
  if (!date) {
    return 'Invalid date';
  }
  
  try {
    const dateOptions: Intl.DateTimeFormatOptions = {
      dateStyle: format as any,
    };
    
    if (includeTime) {
      dateOptions.timeStyle = format as any;
    }
    
    return new Intl.DateTimeFormat('en-US', dateOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toLocaleDateString() + (includeTime ? ' ' + date.toLocaleTimeString() : '');
  }
}

/**
 * Formats a timestamp as a relative time string (e.g., "2 hours ago")
 * 
 * @param timestamp - The timestamp value (bigint or number)
 * @returns Relative time string or 'Invalid date' if invalid
 */
export function formatRelativeTime(timestamp: bigint | number | string): string {
  const date = safeTimestampToDate(timestamp);
  
  if (!date) {
    return 'Invalid date';
  }
  
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return formatTimestamp(timestamp, { includeTime: false, format: 'short' });
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return formatTimestamp(timestamp);
  }
}

/**
 * Checks if a timestamp is valid
 * 
 * @param timestamp - The timestamp value to validate
 * @returns true if the timestamp is valid
 */
export function isValidTimestamp(timestamp: bigint | number | string): boolean {
  return safeTimestampToDate(timestamp) !== null;
}

/**
 * Converts a JavaScript Date to the backend's expected timestamp format (nanoseconds)
 * 
 * @param date - The Date object to convert
 * @returns Timestamp in nanoseconds as bigint
 */
export function dateToBackendTimestamp(date: Date): bigint {
  return BigInt(date.getTime() * 1000000); // Convert milliseconds to nanoseconds
}
