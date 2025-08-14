import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Separator from '../ui/Separator';
import { 
  FileText, 
  ArrowLeft, 
  Unlock, 
  Calendar, 
  User, 
  Eye,
  Download,
  Share2,
  Shield
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import useAuthStore from '../../stores/useAuthStore';

// Mock record data
const mockRecords = [
  {
    id: 1,
    title: 'Annual Physical Exam 2024',
    category: 'General Health',
    status: 'Monetizable',
    owner: 'patient-123',
    createdAt: Date.now() - 86400000 * 8,
    accessCount: 5,
    encryptedBlob: new Uint8Array([1, 2, 3, 4, 5]),
    sharedWith: [
      {
        provider: 'provider-456',
        expiresAt: Date.now() + 86400000 * 30
      }
    ]
  },
  {
    id: 2,
    title: 'Blood Glucose Monitoring',
    category: 'Diabetes Care',
    status: 'Monetizable',
    owner: 'patient-789',
    createdAt: Date.now() - 86400000 * 1,
    accessCount: 12,
    encryptedBlob: new Uint8Array([6, 7, 8, 9, 10]),
    sharedWith: []
  }
];

const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { principal, userRole } = useAuthStore();
  const [decrypting, setDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState(false);

  const recordId = parseInt(id || '0');
  const record = mockRecords.find(r => r.id === recordId);

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Record Not Found</h2>
          <p className="text-gray-600 mb-4">
            The requested health record could not be found.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = principal === record.owner;
  const hasAccess = isOwner || record.sharedWith?.some(s => s.provider === principal);

  const handleDecrypt = async () => {
    if (!principal) return;
    
    setDecrypting(true);
    try {
      // Simulate decryption process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDecrypted(true);
      alert('Record decrypted successfully!');
    } catch (error) {
      alert('Failed to decrypt record');
    } finally {
      setDecrypting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Monetizable': return 'success';
      case 'NonMonetizable': return 'secondary';
      case 'Flagged': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusColor(record.status) as any}>
            {record.status}
          </Badge>
          {isOwner && <Badge variant="secondary">Your Record</Badge>}
        </div>
      </div>

      {/* Record Overview */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <FileText className="h-6 w-6" />
                <span>{record.title}</span>
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {record.category} • Created {formatDistance(new Date(record.createdAt), new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Created: {new Date(record.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Eye className="h-4 w-4 text-gray-500" />
              <span>Accessed: {record.accessCount} times</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span>Owner: {isOwner ? 'You' : 'Anonymous Patient'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="h-4 w-4 text-gray-500" />
              <span>Status: {record.status}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Share2 className="h-4 w-4 text-gray-500" />
              <span>Shared with: {record.sharedWith?.length || 0} providers</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Data Size</p>
              <p className="text-lg">{record.encryptedBlob.length} bytes</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Access Control */}
      {hasAccess ? (
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Unlock className="h-5 w-5 mr-2" />
              Record Access
            </h2>
            <p className="text-gray-600 mt-1">
              You have permission to access this encrypted health record
            </p>
          </div>
          
          {!decrypted ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Encrypted Content</p>
                    <p className="text-sm text-gray-600">
                      This record is encrypted for privacy. Click decrypt to view the contents.
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleDecrypt}
                disabled={decrypting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {decrypting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Decrypting...</span>
                  </div>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Decrypt Record
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Record Decrypted</p>
                    <p className="text-sm text-green-700">
                      You can now view the medical record contents.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mock decrypted content */}
              <div className="space-y-4">
                <Separator />
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900">Medical Record Content</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Patient:</strong> Anonymous (ID: {record.owner.slice(-8)})<br />
                      <strong>Date:</strong> {new Date(record.createdAt).toLocaleDateString()}<br />
                      <strong>Category:</strong> {record.category}<br />
                      <strong>Title:</strong> {record.title}
                    </p>
                    <Separator className="my-3" />
                    <p className="text-sm">
                      This is a simulated view of the decrypted medical record. In a real implementation, 
                      this would show the actual medical data including test results, diagnoses, 
                      treatment plans, and other relevant health information.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to view this health record.
            </p>
            <p className="text-sm text-gray-500">
              Contact the patient to request access to this record.
            </p>
          </div>
        </Card>
      )}

      {/* Sharing Information */}
      {record.sharedWith && record.sharedWith.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Shared Access</h2>
            <p className="text-gray-600 mt-1">
              This record has been shared with the following providers
            </p>
          </div>
          <div className="space-y-3">
            {record.sharedWith.map((share, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Provider ID: {share.provider.slice(-8)}</p>
                    <p className="text-sm text-gray-600">
                      {share.expiresAt 
                        ? `Expires ${formatDistance(new Date(share.expiresAt), new Date(), { addSuffix: true })}`
                        : 'No expiration'
                      }
                    </p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RecordDetail;
