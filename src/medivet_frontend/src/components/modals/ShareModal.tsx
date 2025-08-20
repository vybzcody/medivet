import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import Checkbox from '../ui/Checkbox';
import Textarea from '../ui/Textarea';
import { Share2, User, Search, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { formatDistance } from 'date-fns';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import { HealthRecord } from '../../types';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: number | null;
}

// Mock provider data
const mockProviders = [
  {
    name: 'Dr. Emily Carter',
    license: 'MD12345',
    specialty: 'Cardiology',
    contact: 'emily.carter@hospital.com',
    whitelisted: true,
    reputation: 95,
    organization: 'General Hospital',
    lastInteraction: Date.now() - 86400000 * 2 // 2 days ago
  },
  {
    name: 'Dr. John Smith',
    license: 'MD67890',
    specialty: 'Internal Medicine',
    contact: 'john.smith@clinic.com',
    whitelisted: true,
    reputation: 88,
    organization: 'City Medical Clinic',
    lastInteraction: Date.now() - 86400000 * 7 // 7 days ago
  },
  {
    name: 'Dr. Sarah Johnson',
    license: 'MD11111',
    specialty: 'Dermatology',
    contact: 'sarah.johnson@derma.com',
    whitelisted: true,
    reputation: 92,
    organization: 'Skin Care Center',
    lastInteraction: null
  }
];

const ShareModal: React.FC<ShareModalProps> = ({ open, onOpenChange, recordId }) => {
  const { records } = useHealthRecordStore();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');
  const [inviteMode, setInviteMode] = useState(false);
  const [principalId, setPrincipalId] = useState('');

  const record = recordId ? records.find(r => r.id === recordId) : null;

  const filteredProviders = useMemo(() => {
    if (!searchQuery) return mockProviders.filter(p => p.whitelisted);
    return mockProviders.filter(p => 
      p.whitelisted &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.organization?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  const handleSelectProvider = (provider: any) => {
    setSelectedProvider(provider);
    if (provider.name === 'Dr. John Smith') {
      setPermissions(['full_history']);
    }
    setInviteMode(false);
    setStep(2);
  };

  const handleInviteByPrincipal = () => {
    if (!principalId) {
      alert('Please enter a valid Principal ID');
      return;
    }
    const mockProvider = {
      name: `Principal User (${principalId.substring(0, 8)}...)`,
      license: principalId,
      specialty: 'Invited Provider',
      contact: '',
      whitelisted: true,
      reputation: 0,
      organization: 'Invited via Principal ID'
    };
    handleSelectProvider(mockProvider);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setPermissions(prev => 
      checked ? [...prev, permission] : prev.filter(p => p !== permission)
    );
  };

  const handleShare = async () => {
    if (!record || !selectedProvider) {
      alert('An error occurred. Please try again.');
      return;
    }

    try {
      // Use the principal ID for sharing (either from mock provider or entered manually)
      const principalToShare = selectedProvider.license.startsWith('Principal User') 
        ? principalId 
        : selectedProvider.license; // For mock providers, use license as principal for demo
      
      console.log('Sharing record:', {
        recordId: record.id,
        principalToShare,
        permissions,
        expiryDate,
        note
      });

      // Convert frontend permissions to backend format
      const backendPermissions = permissions.map(p => {
        switch(p) {
          case 'basic_info': return 'ReadBasicInfo';
          case 'full_history': return 'ReadMedicalHistory';
          case 'files': return 'ReadImaging';
          default: return 'ReadBasicInfo';
        }
      });

      // Call the backend to grant access
      const { grantSpecificAccess } = useHealthRecordStore.getState();
      await grantSpecificAccess(
        record.id, 
        principalToShare, 
        backendPermissions, 
        expiryDate
      );

      alert('Record shared successfully!');
      onOpenChange(false);
      
      // Reset state on close
      setTimeout(() => {
        setStep(1);
        setSelectedProvider(null);
        setPermissions([]);
        setNote('');
        setSearchQuery('');
        setPrincipalId('');
        setInviteMode(false);
      }, 300);
    } catch (error: any) {
      console.error('Error sharing record:', error);
      alert(`Failed to share record: ${error.message}`);
    }
  };

  const summary = useMemo(() => {
    if (step !== 2 || !selectedProvider) return '';
    const fileCount = permissions.includes('files') ? 'all files' : 'no files';
    return `You are sharing ${fileCount} with ${selectedProvider.name} until ${new Date(expiryDate).toLocaleDateString()}.`;
  }, [step, selectedProvider, permissions, expiryDate]);

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share "{record.title}"</span>
          </DialogTitle>
          <DialogDescription>
            Grant secure, auditable, time-bound access to a provider.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && !inviteMode && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search providers by name, specialty..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredProviders.map(provider => (
                <div 
                  key={provider.license} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectProvider(provider)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{provider.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-gray-500">{provider.organization}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Last interaction</p>
                    <p className="text-xs font-medium">
                      {provider.lastInteraction ? 
                        formatDistance(new Date(provider.lastInteraction), new Date(), { addSuffix: true }) : 
                        'Never'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setInviteMode(true)}>
              Provider not found? Invite by Principal ID
            </Button>
          </div>
        )}

        {step === 1 && inviteMode && (
          <div className="space-y-4">
            <Label htmlFor="principalId">Provider's Principal ID</Label>
            <Input 
              id="principalId"
              placeholder="Enter Principal ID..."
              value={principalId}
              onChange={(e) => setPrincipalId(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button variant="outline" className="w-full" onClick={() => setInviteMode(false)}>
                Cancel
              </Button>
              <Button className="w-full" onClick={handleInviteByPrincipal}>
                Confirm & Proceed
              </Button>
            </div>
          </div>
        )}

        {step === 2 && selectedProvider && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>{selectedProvider.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedProvider.name}</p>
                <p className="text-sm text-gray-500">{selectedProvider.organization}</p>
              </div>
            </div>
            
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="basic_info" 
                    onCheckedChange={(c) => handlePermissionChange('basic_info', !!c)} 
                    checked={permissions.includes('basic_info')} 
                  />
                  <Label htmlFor="basic_info">Basic Info</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="full_history" 
                    onCheckedChange={(c) => handlePermissionChange('full_history', !!c)} 
                    checked={permissions.includes('full_history')} 
                  />
                  <Label htmlFor="full_history">Full History</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="files" 
                    onCheckedChange={(c) => handlePermissionChange('files', !!c)} 
                    checked={permissions.includes('files')} 
                  />
                  <Label htmlFor="files">Files</Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="expiry">Access Expiry</Label>
              <Input 
                id="expiry" 
                type="date" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)} 
              />
            </div>

            <div>
              <Label htmlFor="note">Optional Note (256 char)</Label>
              <Textarea 
                id="note" 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                maxLength={256} 
              />
            </div>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg text-center text-sm text-gray-600">
            <p>{summary || 'Select a provider to configure permissions.'}</p>
          </div>
          <div className="flex space-x-3">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button 
              onClick={handleShare}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              disabled={step === 1 || !selectedProvider}
            >
              {step === 1 ? 'Next' : 'Share Record'}
              {step === 1 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
