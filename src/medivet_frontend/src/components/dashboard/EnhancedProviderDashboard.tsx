import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  FileText,
  Search,
  TrendingUp,
  Activity,
  Shield,
  Clock,
  Eye,
  Calendar,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { formatDistance } from 'date-fns';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useProviderStore from '../../stores/useProviderStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import { usePolling } from '../../hooks/usePolling';
import TestProviderData from '../TestProviderData';

const EnhancedProviderDashboard: React.FC = () => {
  const { principal } = useAuthStore();
  const { healthcareProviderProfile, fetchHealthcareProviderProfile, isLoading: profileLoading } = useProfileStore();
  const { 
    accessLogs, 
    monetizableRecords, 
    fetchAccessLogs, 
    fetchMonetizableRecords, 
    isLoading: providerLoading 
  } = useProviderStore();
  const { sharedRecords, fetchSharedRecordsWithoutDecryption, isLoading: recordsLoading } = useHealthRecordStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add polling support
  const { refresh, isRefreshing } = usePolling({
    healthRecordsInterval: 30000,
    enableHealthRecords: true,
    enableAccessLogs: true,
    enableOnFocus: true,
    enableOnVisibility: true
  });

  useEffect(() => {
    if (principal) {
      console.log('🔄 Provider dashboard loading data for principal:', principal.toString());
      fetchHealthcareProviderProfile();
      fetchAccessLogs();
      fetchMonetizableRecords();
      fetchSharedRecordsWithoutDecryption();
    }
  }, [principal, fetchHealthcareProviderProfile, fetchAccessLogs, fetchMonetizableRecords, fetchSharedRecordsWithoutDecryption]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Expired': return 'warning';
      case 'Revoked': return 'destructive';
      default: return 'secondary';
    }
  };

  // Map backend permission variant keys to user-friendly labels
  const formatPermission = (p: string) => {
    switch (p) {
      case 'READ_BASIC_INFO': return 'Basic Info';
      case 'READ_MEDICAL_HISTORY': return 'History';
      case 'READ_MEDICATIONS': return 'Medications';
      case 'READ_ALLERGIES': return 'Allergies';
      case 'READ_LAB_RESULTS': return 'Labs';
      case 'READ_IMAGING': return 'Imaging';
      case 'READ_MENTAL_HEALTH': return 'Mental Health';
      case 'WRITE_NOTES': return 'Write Notes';
      case 'WRITE_PRESCRIPTIONS': return 'Prescribe';
      case 'EMERGENCY_ACCESS': return 'Emergency';
      default: return p;
    }
  };

  // Build view-model from sharedRecords limited to this provider's permissions
  const providerRecords = useMemo(() => {
    if (!principal) return [] as Array<{
      id: number;
      patientPrincipal: string;
      title: string;
      category: string;
      lastAccessed?: number;
      status: 'Active' | 'Expired' | 'Revoked' | 'Unknown';
      permissions: string[];
    }>;

    console.log('🔍 Building provider records from sharedRecords:', sharedRecords.length);
    console.log('🔍 Principal:', principal.toString());
    
    return sharedRecords.map((r) => {
      console.log('🔍 Processing record:', r.id, 'user_permissions:', r.user_permissions);
      const entryForMe = (r.user_permissions || []).find((up: any) => {
        const userMatch = up.user === principal.toString();
        console.log('🔍 Checking permission:', up.user, 'vs', principal.toString(), 'match:', userMatch);
        return userMatch;
      });
      
      const perms: string[] = entryForMe?.permissions || [];
      console.log('🔍 Found permissions for record', r.id, ':', perms);
      
      // Determine status by expiry if present
      let status: 'Active' | 'Expired' | 'Revoked' | 'Unknown' = 'Unknown';
      if (entryForMe?.expires_at) {
        const ms = Number(entryForMe.expires_at) / 1_000_000; // ns -> ms
        status = ms >= Date.now() ? 'Active' : 'Expired';
      } else if (perms.length > 0) {
        status = 'Active';
      }
      
      const providerRecord = {
        id: r.id,
        patientPrincipal: r.owner,
        title: r.title,
        category: r.category,
        lastAccessed: r.updated_at,
        status,
        permissions: perms,
      };
      console.log('🔍 Provider record created:', providerRecord);
      return providerRecord;
    }).filter((x) => {
      const hasPerms = x.permissions.length > 0;
      console.log('🔍 Filtering record', x.id, 'has permissions:', hasPerms);
      return hasPerms;
    });
  }, [sharedRecords, principal]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return providerRecords.filter((rec) => {
      const matchesSearch = rec.title.toLowerCase().includes(term) ||
        rec.patientPrincipal.toLowerCase().includes(term) ||
        rec.category.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || rec.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [providerRecords, searchTerm, statusFilter]);
  
  // Debug useEffect to track data changes (after providerRecords is declared)
  useEffect(() => {
    console.log('📊 Provider dashboard data updated:');
    console.log('  - sharedRecords:', sharedRecords.length);
    console.log('  - accessLogs:', accessLogs.length);
    console.log('  - monetizableRecords:', monetizableRecords.length);
    console.log('  - providerRecords:', providerRecords.length);
    console.log('  - filteredRecords:', filteredRecords.length);
    console.log('  - recordsLoading:', recordsLoading);
    console.log('  - providerLoading:', providerLoading);
  }, [sharedRecords, accessLogs, monetizableRecords, providerRecords, filteredRecords, recordsLoading, providerLoading]);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Provider Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Access and manage patient records with granted permissions
          </p>
          {healthcareProviderProfile && (
            <p className="text-sm text-gray-500 mt-1">
              {healthcareProviderProfile.specialization} • {healthcareProviderProfile.facility_name}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={refresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patients (shared)</p>
              <div className="text-2xl font-bold text-gray-900">{new Set(providerRecords.map(r => r.patientPrincipal)).size}</div>
              <p className="text-xs text-gray-500 mt-1">
                with shared records
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Shared Records</p>
              <div className="text-2xl font-bold text-green-600">{providerRecords.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                available to you
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Access</p>
              <div className="text-2xl font-bold text-purple-600">{accessLogs.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                records accessed
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Paid</p>
              <div className="text-2xl font-bold text-blue-600">{accessLogs.reduce((sum, log) => sum + log.paid_amount, 0)} MT</div>
              <p className="text-xs text-gray-500 mt-1">
                for data access
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Test Component */}
      <TestProviderData />
      
      {/* Debug Information (temporary) */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
            🔍 Debug Information
          </h2>
          <p className="text-yellow-700 text-sm mt-1">
            This section helps debug the provider dashboard data flow
          </p>
        </div>
        
        <div className="space-y-2 text-sm">
          <div><strong>Principal:</strong> {principal?.toString() || 'Not authenticated'}</div>
          <div><strong>Provider Profile:</strong> {healthcareProviderProfile ? '✅ Loaded' : '❌ Missing'}</div>
          <div><strong>Raw Shared Records:</strong> {sharedRecords.length}</div>
          <div><strong>Provider Records (filtered):</strong> {providerRecords.length}</div>
          <div><strong>Access Logs:</strong> {accessLogs.length}</div>
          <div><strong>Records Loading:</strong> {recordsLoading ? '⏳' : '✅'}</div>
          <div><strong>Provider Loading:</strong> {providerLoading ? '⏳' : '✅'}</div>
          
          {sharedRecords.length > 0 && (
            <div className="mt-4">
              <strong>Sample Record Data:</strong>
              <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-x-auto">
                {JSON.stringify(sharedRecords[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Search and Filter */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search patients or records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Patient Records Table */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Records Access</h2>
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.patientPrincipal.slice(0, 12)}...</TableCell>
                    <TableCell>{record.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {record.permissions.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {formatPermission(permission)}
                          </Badge>
                        ))}
                        {record.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{record.permissions.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.lastAccessed ? (
                        formatDistance(new Date(record.lastAccessed), new Date(), { addSuffix: true })
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(record.status) as any}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No patient records have been shared with you yet'
                }
              </p>
              {sharedRecords.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>For testing:</strong> To see shared records, a patient needs to share a record with your provider principal:
                  </p>
                  <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 block">
                    {principal?.toString() || 'Not authenticated'}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Access Logs */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Access Activity
          </h2>
          <p className="text-gray-600 mt-1">Your recent interactions with patient records</p>
        </div>

        <div className="space-y-4">
          {accessLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{log.action} record</p>
                  <p className="text-sm text-gray-600">Record #{log.record_id} - Amount: {log.paid_amount} MT</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDistance(new Date(log.access_time / 1000000), new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}

          {accessLogs.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-600">
                Your access activity will appear here
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Compliance and Security */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            Compliance & Security
          </h2>
          <p className="text-gray-600 mt-1">
            Your data access compliance status
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-sm text-green-700">HIPAA Compliant</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">256-bit</div>
            <p className="text-sm text-blue-700">Encryption</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">Audit</div>
            <p className="text-sm text-purple-700">Trail Active</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedProviderDashboard;
