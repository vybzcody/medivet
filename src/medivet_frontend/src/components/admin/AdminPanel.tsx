import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Switch from '../ui/Switch';
import Button from '../ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { 
  Shield, 
  Users, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import ConfirmationDialog from '../ui/ConfirmationDialog';

// Mock data for admin panel
const mockProviders = [
  {
    name: 'Dr. James Wilson',
    license: 'MD12345',
    specialty: 'Neurology',
    contact: 'james.wilson@neuro.com',
    whitelisted: false,
    reputation: 88,
    organization: 'Neuro Clinic'
  },
  {
    name: 'Dr. Sarah Kim',
    license: 'MD67890',
    specialty: 'Cardiology',
    contact: 'sarah.kim@heart.com',
    whitelisted: true,
    reputation: 95,
    organization: 'Heart Center'
  }
];

const mockRecords = [
  {
    id: 1,
    title: 'Mental Health Assessment',
    category: 'Mental Health',
    status: 'Flagged',
    createdAt: Date.now() - 86400000 * 2,
    accessCount: 3
  },
  {
    id: 2,
    title: 'Diabetes Management Data',
    category: 'Diabetes Care',
    status: 'Monetizable',
    createdAt: Date.now() - 86400000 * 5,
    accessCount: 12
  }
];

const mockListings = [
  {
    id: 1,
    status: 'sold',
    currentHighestBid: 150
  },
  {
    id: 2,
    status: 'active',
    currentHighestBid: 200
  }
];

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ 
    title: '', 
    description: '', 
    onConfirm: () => {},
    variant: 'default' as 'default' | 'destructive'
  });

  const pendingProviders = mockProviders.filter(p => !p.whitelisted);
  const whitelistedProviders = mockProviders.filter(p => p.whitelisted);
  const flaggedRecords = mockRecords.filter(r => r.status === 'Flagged');
  const monetizableRecords = mockRecords.filter(r => r.status === 'Monetizable');

  const handleWhitelistProvider = (license: string, whitelisted: boolean) => {
    console.log(`Provider ${license} ${whitelisted ? 'approved' : 'removed from whitelist'}`);
    alert(`Provider ${whitelisted ? 'approved' : 'removed from whitelist'}`);
  };

  const handleFlagRecord = (recordId: number, flagged: boolean) => {
    console.log(`Record ${recordId} ${flagged ? 'flagged' : 'unflagged'}`);
    alert(`Record ${flagged ? 'flagged' : 'unflagged'}`);
  };

  const openConfirmationDialog = (
    title: string, 
    description: string, 
    onConfirm: () => void,
    variant: 'default' | 'destructive' = 'default'
  ) => {
    setDialogConfig({ title, description, onConfirm, variant });
    setDialogOpen(true);
  };

  const handleRejectProvider = (providerName: string) => {
    openConfirmationDialog(
      'Reject Provider?',
      `Are you sure you want to reject ${providerName}? This action cannot be undone.`,
      () => alert('Provider rejection feature not implemented yet.'),
      'destructive'
    );
  };

  const handleRevokeProvider = (license: string, providerName: string) => {
    openConfirmationDialog(
      'Revoke Provider?',
      `Are you sure you want to revoke access for ${providerName}?`,
      () => handleWhitelistProvider(license, false),
      'destructive'
    );
  };

  const handleRemoveRecord = (recordId: number, recordTitle: string) => {
    openConfirmationDialog(
      'Remove Record?',
      `Are you sure you want to permanently remove the record "${recordTitle}"?`,
      () => alert('Record removal feature not implemented yet.'),
      'destructive'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">
            Platform management and governance controls
          </p>
        </div>
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Administrator Access</span>
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <div className="text-2xl font-bold text-yellow-600">{pendingProviders.length}</div>
              <p className="text-xs text-gray-500 mt-1">Providers awaiting verification</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified Providers</p>
              <div className="text-2xl font-bold text-green-600">{whitelistedProviders.length}</div>
              <p className="text-xs text-gray-500 mt-1">Active verified providers</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flagged Records</p>
              <div className="text-2xl font-bold text-red-600">{flaggedRecords.length}</div>
              <p className="text-xs text-gray-500 mt-1">Records requiring review</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
              <div className="text-2xl font-bold text-green-600">
                {mockListings.filter(l => l.status === 'sold').reduce((sum, l) => sum + (l.currentHighestBid || 0), 0)} MT
              </div>
              <p className="text-xs text-gray-500 mt-1">Total marketplace volume</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Platform Health</h3>
                <p className="text-gray-600 text-sm">Key metrics and system status</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>System Status</span>
                  <Badge variant="success">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Users</span>
                  <span className="font-medium">{mockProviders.length + 1} users</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Integrity</span>
                  <Badge variant="success">100%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marketplace Activity</span>
                  <Badge variant="success">High</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-gray-600 text-sm">Latest platform events</p>
              </div>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">New provider registration</p>
                  <p className="text-gray-600">Dr. James Wilson - Neurology</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Record flagged for review</p>
                  <p className="text-gray-600">Mental Health Assessment</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Marketplace bid accepted</p>
                  <p className="text-gray-600">150 MT - Diabetes data</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Provider whitelist updated</p>
                  <p className="text-gray-600">Dr. Sarah Kim approved</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          {/* Pending Providers */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                Pending Provider Approvals
              </h3>
              <p className="text-gray-600 mt-1">Healthcare providers awaiting verification</p>
            </div>
            <div className="space-y-4">
              {pendingProviders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending approvals</p>
              ) : (
                pendingProviders.map((provider) => (
                  <div key={provider.license} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{provider.name}</h4>
                        <Badge variant="secondary">{provider.specialty}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        License: {provider.license} • Reputation: {provider.reputation}%
                      </div>
                      <div className="text-sm text-gray-600">
                        Contact: {provider.contact}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRejectProvider(provider.name)}
                      >
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleWhitelistProvider(provider.license, true)}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Verified Providers */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Verified Providers
              </h3>
              <p className="text-gray-600 mt-1">Currently approved healthcare providers</p>
            </div>
            <div className="space-y-4">
              {whitelistedProviders.map((provider) => (
                <div key={provider.license} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{provider.name}</h4>
                      <Badge variant="default">{provider.specialty}</Badge>
                      <Badge variant="success">Verified</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      License: {provider.license} • Reputation: {provider.reputation}%
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRevokeProvider(provider.license, provider.name)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          {/* Flagged Records */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Flagged Records
              </h3>
              <p className="text-gray-600 mt-1">Health records requiring administrative review</p>
            </div>
            <div className="space-y-4">
              {flaggedRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No flagged records</p>
              ) : (
                flaggedRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{record.title}</h4>
                        <Badge variant="destructive">Flagged</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Category: {record.category} • Created: {new Date(record.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFlagRecord(record.id, false)}
                      >
                        Unflag
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRemoveRecord(record.id, record.title)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Monetization Control */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Monetization Control
              </h3>
              <p className="text-gray-600 mt-1">Manage which records can be monetized</p>
            </div>
            <div className="space-y-4">
              {monetizableRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{record.title}</h4>
                      <Badge variant="success">Monetizable</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Category: {record.category} • Access count: {record.accessCount}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={record.status === 'Monetizable'}
                      onCheckedChange={(checked) => handleFlagRecord(record.id, !checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        variant={dialogConfig.variant}
      />
    </div>
  );
};

export default AdminPanel;
