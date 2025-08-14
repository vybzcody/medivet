import React, { useEffect, useState } from 'react';
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
import { usePolling } from '../../hooks/usePolling';

// Mock data for provider dashboard - in real app this would come from stores
const mockProviderData = {
  totalPatients: 24,
  activeRecords: 156,
  recentAccess: 8,
  dataQuality: 95
};

const mockPatientRecords = [
  {
    id: 1,
    patientName: 'Sarah Johnson',
    recordTitle: 'Annual Physical Exam 2024',
    category: 'General',
    lastAccessed: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'Active',
    permissions: ['ViewBasicInfo', 'ViewMedicalHistory']
  },
  {
    id: 2,
    patientName: 'Michael Chen',
    recordTitle: 'Cardiology Consultation',
    category: 'Cardiology',
    lastAccessed: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'Active',
    permissions: ['ViewBasicInfo', 'ViewMedicalHistory', 'ViewAllergies']
  },
  {
    id: 3,
    patientName: 'Emily Rodriguez',
    recordTitle: 'Lab Results - Blood Panel',
    category: 'Laboratory',
    lastAccessed: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: 'Expired',
    permissions: ['ViewBasicInfo']
  },
  {
    id: 4,
    patientName: 'David Wilson',
    recordTitle: 'Dermatology Assessment',
    category: 'Dermatology',
    lastAccessed: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Active',
    permissions: ['ViewBasicInfo', 'ViewMedicalHistory', 'ViewAllergies', 'ViewMedications']
  }
];

const mockAccessLogs = [
  {
    id: 1,
    patientName: 'Sarah Johnson',
    recordTitle: 'Annual Physical Exam 2024',
    accessTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    action: 'Viewed'
  },
  {
    id: 2,
    patientName: 'Michael Chen',
    recordTitle: 'Cardiology Consultation',
    accessTime: new Date(Date.now() - 3600000 * 5).toISOString(),
    action: 'Downloaded'
  },
  {
    id: 3,
    patientName: 'Emily Rodriguez',
    recordTitle: 'Lab Results - Blood Panel',
    accessTime: new Date(Date.now() - 3600000 * 8).toISOString(),
    action: 'Viewed'
  }
];

const EnhancedProviderDashboard: React.FC = () => {
  const { principal } = useAuthStore();
  const { healthcareProviderProfile, fetchHealthcareProviderProfile, isLoading: profileLoading } = useProfileStore();
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
      fetchHealthcareProviderProfile();
    }
  }, [principal, fetchHealthcareProviderProfile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Expired': return 'warning';
      case 'Revoked': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredRecords = mockPatientRecords.filter(record => {
    const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.recordTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <div className="text-2xl font-bold text-gray-900">{mockProviderData.totalPatients}</div>
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
              <p className="text-sm font-medium text-gray-600">Active Records</p>
              <div className="text-2xl font-bold text-green-600">{mockProviderData.activeRecords}</div>
              <p className="text-xs text-gray-500 mt-1">
                accessible records
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
              <p className="text-sm font-medium text-gray-600">Recent Access</p>
              <div className="text-2xl font-bold text-purple-600">{mockProviderData.recentAccess}</div>
              <p className="text-xs text-gray-500 mt-1">
                in last 24 hours
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
              <p className="text-sm font-medium text-gray-600">Data Quality</p>
              <div className="text-2xl font-bold text-blue-600">{mockProviderData.dataQuality}%</div>
              <p className="text-xs text-gray-500 mt-1">
                compliance score
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

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
                  <TableHead>Last Accessed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.patientName}</TableCell>
                    <TableCell>{record.recordTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {record.permissions.slice(0, 2).map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission.replace('View', '')}
                          </Badge>
                        ))}
                        {record.permissions.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{record.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistance(new Date(record.lastAccessed), new Date(), { addSuffix: true })}
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
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No patient records have been shared with you yet'
                }
              </p>
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
          {mockAccessLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{log.action} record</p>
                  <p className="text-sm text-gray-600">{log.recordTitle} - {log.patientName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDistance(new Date(log.accessTime), new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}

          {mockAccessLogs.length === 0 && (
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
