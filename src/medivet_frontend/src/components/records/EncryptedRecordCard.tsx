import React, { useState } from 'react';
import { Eye, EyeOff, Calendar, User, FileText, Lock, Unlock, UserCheck, Shield } from 'lucide-react';
import { HealthRecord } from '../../types';
import { CryptoService } from '../../services/CryptoService';
import { createAuthenticatedActor } from '../../services/actorService';
import useAuthStore from '../../stores/useAuthStore';
import PatientProfileModal from '../modals/PatientProfileModal';
import { formatTimestamp } from '../../utils/dateUtils';

interface EncryptedRecordCardProps {
  record: HealthRecord;
  onAccessLogged?: () => void;
}

const EncryptedRecordCard: React.FC<EncryptedRecordCardProps> = ({ 
  record, 
  onAccessLogged 
}) => {
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const { identity } = useAuthStore();

  const handleDecrypt = async () => {
    if (isDecrypted) {
      // Hide decrypted content
      setIsDecrypted(false);
      setDecryptedContent('');
      return;
    }

    setIsDecrypting(true);
    setError('');

    try {
      // First, log the access attempt
      const { actor } = await createAuthenticatedActor(identity);
      const accessLogged = await actor.log_record_access(BigInt(record.id));
      
      if (!accessLogged) {
        throw new Error('Access denied or logging failed');
      }

      // Then decrypt the content
      const decrypted = await CryptoService.decryptWithRecordKey(
        BigInt(record.id),
        record.owner,
        new TextDecoder().decode(record.encrypted_content)
      );

      setDecryptedContent(decrypted);
      setIsDecrypted(true);
      
      // Notify parent component that access was logged
      if (onAccessLogged) {
        onAccessLogged();
      }
    } catch (err: any) {
      console.error('Error decrypting record:', err);
      setError(err.message || 'Failed to decrypt record');
    } finally {
      setIsDecrypting(false);
    }
  };


  const formatContent = (content: string) => {
    try {
      // Try to parse as JSON for structured display
      const parsed = JSON.parse(content);
      return (
        <div className="space-y-3">
          {Object.entries(parsed).map(([key, value]) => (
            <div key={key} className="border-b border-gray-200 pb-2 last:border-b-0">
              <dt className="text-sm font-medium text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </dt>
              <dd className="text-sm text-gray-900 mt-1">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </dd>
            </div>
          ))}
        </div>
      );
    } catch {
      // If not JSON, display as formatted text
      return (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {content}
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {/* Header with Record Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Health Record #{record.id.toString()}
            </h3>
            <div className="flex items-center space-x-1">
              {isDecrypted ? (
                <Unlock className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm text-gray-500">
                {isDecrypted ? 'Decrypted' : 'Encrypted'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Patient: {record.owner.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Created: {formatTimestamp(record.record_date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Type: {record.record_type}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Title:</span> {record.title}
            </div>
            <div>
              <span className="font-medium">Category:</span> {record.category}
            </div>
            <div>
              <span className="font-medium">Provider:</span> {record.provider}
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Permissions: {record.user_permissions.length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handleDecrypt}
          disabled={isDecrypting}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
            isDecrypted
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDecrypting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Decrypting...</span>
            </>
          ) : isDecrypted ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hide Content</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Decrypt & View</span>
            </>
          )}
        </button>
        
        {isDecrypted && (
          <button
            onClick={() => setShowPatientProfile(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <span>View Patient Profile</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Decrypted Content */}
      {isDecrypted && decryptedContent && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Unlock className="h-4 w-4 text-green-600" />
            Decrypted Record Content
          </h4>
          <div className="bg-gray-50 rounded-md p-4">
            {formatContent(decryptedContent)}
          </div>
        </div>
      )}

      {/* Encrypted Content Preview (when not decrypted) */}
      {!isDecrypted && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Encrypted Content:</h4>
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-sm text-gray-500 font-mono break-all">
              {new TextDecoder().decode(record.encrypted_content.slice(0, 100))}...
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Click "Decrypt & View" to see the actual content
            </p>
          </div>
        </div>
      )}
      
      {/* Patient Profile Modal */}
      <PatientProfileModal
        isOpen={showPatientProfile}
        onClose={() => setShowPatientProfile(false)}
        patientPrincipal={record.owner}
        userPermissions={record.user_permissions}
      />
    </div>
  );
};

export default EncryptedRecordCard;
