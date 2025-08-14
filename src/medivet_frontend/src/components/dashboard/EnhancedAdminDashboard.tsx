import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  Shield, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Badge from '../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';

// Mock admin data
const mockAdminStats = {
  totalUsers: 1247,
  totalRecords: 8934,
  flaggedRecords: 12,
  systemHealth: 98.5
};

const mockFlaggedRecords = [
  {
    id: 1,
    title: 'Suspicious Lab Results',
    patient: 'Anonymous User #1234',
    flaggedBy: 'AI System',
    reason: 'Potential data inconsistency',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'Under Review'
  },
  {
    id: 2,
    title: 'Duplicate Medical History',
    patient: 'Anonymous User #5678',
    flaggedBy: 'Provider Report',
    reason: 'Duplicate content detected',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Resolved'
  }
];

const EnhancedAdminDashboard: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'Under Review': return 'warning';
      case 'Escalated': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            System overview and content moderation
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <div className="text-2xl font-bold text-gray-900">{mockAdminStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">+12% this month</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <div className="text-2xl font-bold text-green-600">{mockAdminStats.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">+8% this month</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flagged Records</p>
              <div className="text-2xl font-bold text-red-600">{mockAdminStats.flaggedRecords}</div>
              <p className="text-xs text-gray-500 mt-1">Needs attention</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <div className="text-2xl font-bold text-green-600">{mockAdminStats.systemHealth}%</div>
              <p className="text-xs text-gray-500 mt-1">All systems operational</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Flagged Records */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Flagged Records
          </h2>
          <p className="text-gray-600 mt-1">Records requiring moderation review</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Flagged By</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockFlaggedRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.title}</TableCell>
                <TableCell>{record.patient}</TableCell>
                <TableCell>{record.flaggedBy}</TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(record.status) as any}>
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button variant="ghost" size="sm">
                      <XCircle className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default EnhancedAdminDashboard;
