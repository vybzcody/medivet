import React, { useEffect, useState } from 'react';
import {
  Clock,
  Eye,
  Download,
  Shield,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { formatDistance, format } from 'date-fns';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import useAuthStore from '../../stores/useAuthStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import useProviderStore from '../../stores/useProviderStore';
import useProfileStore from '../../stores/useProfileStore';
import { AccessLog } from '../../types';

interface AuditTrailProps {
  recordId?: number;
  showAllActivity?: boolean;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ 
  recordId, 
  showAllActivity = false 
}) => {
  const { principal } = useAuthStore();
  const { patientProfile, healthcareProviderProfile } = useProfileStore();
  const { getRecordAccessLogs } = useHealthRecordStore();
  const { accessLogs, fetchAccessLogs } = useProviderStore();
  
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!principal) return;
      
      setIsLoading(true);
      try {
        if (recordId) {
          // Fetch logs for specific record
          const recordLogs = await getRecordAccessLogs(recordId);
          setLogs(recordLogs);
        } else if (showAllActivity) {
          // For providers, fetch all their access logs
          if (healthcareProviderProfile) {
            await fetchAccessLogs();
            setLogs(accessLogs);
          } else {
            // For patients, we don't have a general access log method yet
            // This would need to be implemented to show all access to patient's records
            setLogs([]);
          }
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        setLogs([]);
      }
      setIsLoading(false);
    };

    fetchLogs();
  }, [
    principal, 
    recordId, 
    showAllActivity, 
    getRecordAccessLogs, 
    fetchAccessLogs, 
    accessLogs,
    healthcareProviderProfile,
    patientProfile
  ]);

  const filterLogs = (logs: AccessLog[]) => {
    let filtered = [...logs];
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const timeRanges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      const cutoff = now - timeRanges[dateFilter as keyof typeof timeRanges];
      filtered = filtered.filter(log => log.access_time / 1000000 > cutoff);
    }
    
    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action.toLowerCase() === actionFilter);
    }
    
    // Sort by most recent first
    return filtered.sort((a, b) => b.access_time - a.access_time);
  };

  const filteredLogs = filterLogs(logs);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'downloaded':
        return <Download className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'downloaded':
        return 'warning';
      case 'viewed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-600" />
          {recordId ? `Access Audit Trail - Record #${recordId}` : 'Access Activity'}
        </h2>
        <p className="text-gray-600 mt-1">
          {recordId 
            ? 'Track who has accessed this health record'
            : 'Complete audit trail of data access activity'
          }
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Actions</option>
            <option value="viewed">Viewed</option>
            <option value="downloaded">Downloaded</option>
            <option value="accessed">Accessed</option>
          </select>
        </div>
        
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {filteredLogs.length} entries found
        </div>
      </div>

      {/* Audit Log Table */}
      {filteredLogs.length > 0 ? (
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                {!recordId && <TableHead>Record ID</TableHead>}
                <TableHead>Provider</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Time Ago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-gray-100">
                        {getActionIcon(log.action)}
                      </div>
                      <Badge variant={getActionColor(log.action) as any}>
                        {log.action}
                      </Badge>
                    </div>
                  </TableCell>
                  {!recordId && (
                    <TableCell>
                      <span className="font-mono text-sm">#{log.record_id}</span>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-xs text-gray-600">
                        {log.provider_principal.slice(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      {log.paid_amount} MT
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(log.access_time / 1000000), 'MMM dd, yyyy')}
                      <div className="text-xs text-gray-500">
                        {format(new Date(log.access_time / 1000000), 'HH:mm:ss')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {formatDistance(new Date(log.access_time / 1000000), new Date(), { 
                        addSuffix: true 
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries</h3>
          <p className="text-gray-600">
            {recordId 
              ? 'This record has not been accessed by any providers yet'
              : 'No access activity to display'
            }
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{filteredLogs.length}</div>
              <p className="text-sm text-blue-700">Total Access Events</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filteredLogs.reduce((sum, log) => sum + log.paid_amount, 0)} MT
              </div>
              <p className="text-sm text-green-700">Total Amount Paid</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredLogs.map(log => log.provider_principal)).size}
              </div>
              <p className="text-sm text-purple-700">Unique Providers</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AuditTrail;
