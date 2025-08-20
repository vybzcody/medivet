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
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Progress from '../ui/Progress';
import { formatDistance } from 'date-fns';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import UploadModal from '../modals/UploadModal';
import ShareModal from '../modals/ShareModal';
import ViewRecordModal from '../modals/ViewRecordModal';
import AiInsightConsentModal from '../modals/AiInsightConsentModal';
import AiInsightResultModal from '../modals/AiInsightResultModal';
import WithdrawalModal from '../modals/WithdrawalModal';
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
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAiConsentModal, setShowAiConsentModal] = useState(false);
  const [showAiResultModal, setShowAiResultModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [aiInsightData, setAiInsightData] = useState<any>(null);

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

  const handleShare = (recordId: number) => {
    setSelectedRecordId(recordId);
    setShowShareModal(true);
  };

  const handleView = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  };

  const handleViewModalShare = (recordId: number) => {
    setSelectedRecordId(recordId);
    setShowViewModal(false);
    setShowShareModal(true);
  };

  const handleAiInsightGenerated = (insight: any) => {
    setAiInsightData(insight);
    setShowAiResultModal(true);
  };

  const getStatusColor = (record: HealthRecord) => {
    // Since status doesn't exist in HealthRecord, we'll determine status based on other properties
    if (record.user_permissions && record.user_permissions.length > 0) {
      return 'success'; // Has permissions, so it's monetizable
    }
    return 'secondary'; // Default status
  };

  const monetizableRecords = records.filter(r => 
    r.user_permissions && r.user_permissions.length > 0
  ).length;

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
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Record
          </Button>
          <Button
            onClick={() => setShowWithdrawalModal(true)}
            variant="outline"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Withdraw Funds
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

      {/* AI Health Insights Card */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            AI Health Insights (Preview)
          </h2>
          <p className="text-gray-600 mt-1">
            100% opt-in, encrypted on-device demo.
          </p>
        </div>
        <Button 
          onClick={() => setShowAiConsentModal(true)}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
        >
          Try Demo
        </Button>
      </Card>

      {/* Data Monetization Status */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Data Monetization
            <Badge variant="success" className="ml-2">
              Enabled
            </Badge>
          </h2>
          <p className="text-gray-600 mt-1">
            Control how your health data can be used for research and compensation
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Monetization Status</p>
              <p className="text-sm text-gray-600">
                Your data can be listed on the marketplace
              </p>
            </div>
            <Button variant="outline">
              Manage Settings
            </Button>
          </div>
          <Progress value={100} className="h-2" />
        </div>
      </Card>

      {/* Recent Records */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Your Health Records
          </h2>
          <p className="text-gray-600 mt-1">
            Manage and share your medical data securely
          </p>
        </div>

        <div className="space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No health records yet</h3>
              <p className="text-gray-600 mb-4">Upload your first record to get started</p>
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Record
              </Button>
            </div>
          ) : (
            records.map((record) => (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{record.title}</h4>
                    <Badge variant={getStatusColor(record) as any}>
                      {record.user_permissions && record.user_permissions.length > 0 ? 'Shared' : 'Private'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistance(new Date(Number(record.record_date)), new Date(), { addSuffix: true })}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>0 views</span>
                    </span>
                    <span className="capitalize text-blue-600">{record.category}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(record.id)}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleView(record)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modals */}
      <UploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
      />
      
      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        recordId={selectedRecordId}
      />
      
      <ViewRecordModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        record={selectedRecord}
        onShare={handleViewModalShare}
      />

      <AiInsightConsentModal
        open={showAiConsentModal}
        onOpenChange={setShowAiConsentModal}
        onInsightGenerated={handleAiInsightGenerated}
      />

      <AiInsightResultModal
        open={showAiResultModal}
        onOpenChange={setShowAiResultModal}
        insightData={aiInsightData}
      />

      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
      />
    </div>
  );
};

export default EnhancedPatientDashboard;
