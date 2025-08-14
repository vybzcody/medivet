import React, { useEffect, useState } from 'react';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Share2, 
  Eye, 
  Calendar, 
  TrendingUp, 
  Activity,
  Shield,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Badge from '../ui/Badge';
import Progress from '../ui/Progress';
import { formatDistance } from 'date-fns';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import AddRecordModal from './AddRecordModal';
import ShareRecordModal from './ShareRecordModal';
import { HealthRecord } from '../../types';
import { usePolling } from '../../hooks/usePolling';

// Mock data for enhanced features
const mockMarketData = {
  totalEarnings: 445.50,
  activeListings: 3,
  totalBids: 12,
  soldRecords: 5
};

const EnhancedPatientDashboard: React.FC = () => {
  const { principal } = useAuthStore();
  const { patientProfile, fetchPatientProfile, isLoading: profileLoading } = useProfileStore();
  const { 
    records, 
    fetchRecords, 
    isLoading: recordsLoading 
  } = useHealthRecordStore();
  
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);

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
      fetchPatientProfile();
      fetchRecords();
    }
  }, [principal, fetchPatientProfile, fetchRecords]);

  const handleShare = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowShareModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Monetizable': return 'success';
      case 'NonMonetizable': return 'secondary';
      case 'Flagged': return 'destructive';
      default: return 'secondary';
    }
  };

  const monetizableRecords = records.filter(r => r.status === 'Monetizable').length;

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
            Welcome back, {patientProfile?.full_name?.split(' ')[0] || 'Patient'}
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your health records and data monetization
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowAddRecordModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Record
          </Button>
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
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <div className="text-2xl font-bold text-gray-900">{records.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {monetizableRecords} monetizable
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <div className="text-2xl font-bold text-green-600">${mockMarketData.totalEarnings}</div>
              <p className="text-xs text-gray-500 mt-1">
                From {mockMarketData.soldRecords} sales
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Listings</p>
              <div className="text-2xl font-bold text-yellow-600">{mockMarketData.activeListings}</div>
              <p className="text-xs text-gray-500 mt-1">
                {mockMarketData.totalBids} total bids
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Privacy</p>
              <div className="text-2xl font-bold text-blue-600">Secure</div>
              <p className="text-xs text-gray-500 mt-1">
                End-to-end encrypted
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Continue with rest of component... */}
      {/* Modals */}
      <AddRecordModal
        isOpen={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
      />
      
      {selectedRecord && (
        <ShareRecordModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
        />
      )}
    </div>
  );
};

export default EnhancedPatientDashboard;
