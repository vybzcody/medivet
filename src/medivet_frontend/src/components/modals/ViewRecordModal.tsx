import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import { 
  X, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  Tag, 
  Clock,
  Share2,
  Lock,
  Shield,
  Download,
  ExternalLink
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { HealthRecord } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ViewRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: HealthRecord | null;
  onShare?: (recordId: number) => void;
}

const ViewRecordModal: React.FC<ViewRecordModalProps> = ({ 
  open, 
  onOpenChange, 
  record,
  onShare 
}) => {
  if (!record) return null;

  const formatDate = (timestamp: string | number) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert from nanoseconds
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (record.user_permissions && record.user_permissions.length > 0) {
      return 'success'; // Has permissions, so it's shared
    }
    return 'secondary'; // Private
  };

  const handleShare = () => {
    if (onShare) {
      onShare(record.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>{record.title}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed view of your health record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Quick Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Badge variant={getStatusColor() as any}>
                {record.user_permissions && record.user_permissions.length > 0 ? (
                  <>
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared with {record.user_permissions.length} user(s)
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Record Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Record Type</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 capitalize">{record.record_type}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <div className="flex items-center space-x-2 mt-1">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 capitalize">{record.category}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Healthcare Provider</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{record.provider}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Record Date</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{formatDate(record.record_date)}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {formatDistance(new Date(Number(record.record_date)), new Date(), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Record ID</label>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-900 font-mono text-sm">{record.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Record Content */}
          {record.content && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Record Content</label>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{record.content}</p>
              </div>
            </div>
          )}

          {/* File Attachments */}
          {record.attachment_id && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Attachments</label>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Medical Record File</p>
                      <p className="text-sm text-gray-500">Attached document</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Permissions & Access */}
          {record.user_permissions && record.user_permissions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Sharing & Permissions</label>
              <div className="border border-gray-200 rounded-lg">
                {record.user_permissions.map((permission, index) => (
                  <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {permission.user.substring(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-500">
                            {permission.permissions.length} permission(s) granted
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {permission.permissions.join(', ')}
                        </p>
                        {permission.expires_at != null && permission.expires_at > 0n ? (
                          <p className="text-xs text-gray-500">
                            Expires: {formatDate(Number(permission.expires_at))}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Privacy & Security</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This health record is encrypted and stored securely on the Internet Computer blockchain. 
                  Only you and users you've granted permission to can access this information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Record created {formatDistance(new Date(Number(record.record_date)), new Date(), { addSuffix: true })}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRecordModal;
