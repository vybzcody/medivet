import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Textarea from '../ui/Textarea';
import Switch from '../ui/Switch';
import Badge from '../ui/Badge';
import ProfilePhotoUpload from '../common/ProfilePhotoUpload';
import FileManager from '../files/FileManager';
import { User, Save, Shield, DollarSign, Calendar, Phone, Mail, AlertCircle, Files } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useFileStore from '../../stores/useFileStore';
import { PatientProfile as PatientProfileType } from '../../types';

const EnhancedPatientProfile: React.FC = () => {
  const { principal } = useAuthStore();
  const { patientProfile, fetchPatientProfile, updatePatientProfile, isLoading, error } = useProfileStore();
  const { profilePhotoUrl, loadProfilePhoto } = useFileStore();
  const [saving, setSaving] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [formData, setFormData] = useState<Partial<PatientProfileType>>({
    full_name: '',
    date_of_birth: '',
    contact_info: '',
    emergency_contact: '',
    medical_history: '',
    allergies: '',
    current_medications: '',
  });
  const [monetizeEnabled, setMonetizeEnabled] = useState(false);

  // Fetch profile data on component mount
  useEffect(() => {
    fetchPatientProfile();
    loadProfilePhoto();
  }, [fetchPatientProfile, loadProfilePhoto]);

  useEffect(() => {
    if (patientProfile) {
      setFormData({
        full_name: patientProfile.full_name || '',
        date_of_birth: patientProfile.date_of_birth || '',
        contact_info: patientProfile.contact_info || '',
        emergency_contact: patientProfile.emergency_contact || '',
        medical_history: patientProfile.medical_history || '',
        allergies: patientProfile.allergies || '',
        current_medications: patientProfile.current_medications || '',
      });
    }
  }, [patientProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePatientProfile(
        formData.full_name || '',
        formData.date_of_birth || '',
        formData.contact_info || '',
        formData.emergency_contact || '',
        formData.medical_history || '',
        formData.allergies || '',
        formData.current_medications || ''
      );
      // Show success message
      console.log('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof PatientProfileType, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information and privacy settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Profile Photo Section */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Profile Photo
          </h2>
          <p className="text-gray-600 mt-1">
            Upload and manage your profile photo
          </p>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8 space-y-6 lg:space-y-0">
          <ProfilePhotoUpload
            currentPhotoUrl={profilePhotoUrl}
            onUploadComplete={(url) => {
              console.log('Profile photo uploaded successfully:', url);
              // Refresh profile photo
              loadProfilePhoto();
            }}
            onUploadError={(error) => {
              console.error('Profile photo upload error:', error);
            }}
            size="large"
            className="lg:flex-shrink-0"
          />
          <div className="flex-1 space-y-2">
            <h3 className="font-medium text-gray-900">Photo Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use a clear, recent photo of yourself</li>
              <li>• Ensure good lighting and focus</li>
              <li>• Supported formats: JPEG, PNG, WebP</li>
              <li>• Maximum file size: 5MB</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </h2>
            <p className="text-gray-600 mt-1">
              Your personal details and contact information
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contact">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="contact"
                  type="email"
                  value={formData.contact_info || ''}
                  onChange={(e) => handleInputChange('contact_info', e.target.value)}
                  placeholder="your.email@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="emergency">Emergency Contact</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="emergency"
                  value={formData.emergency_contact || ''}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                  placeholder="Emergency contact name and phone"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Privacy & Monetization */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Data Monetization
            </h2>
            <p className="text-gray-600 mt-1">
              Control how your health data can be used
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <p className="font-medium text-gray-900">Enable Data Monetization</p>
                <p className="text-sm text-gray-600">
                  Allow your anonymized health data to be listed on the marketplace
                </p>
              </div>
              <Switch
                checked={monetizeEnabled}
                onCheckedChange={setMonetizeEnabled}
              />
            </div>

            {monetizeEnabled ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Monetization Enabled</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-sm text-green-700">
                  Your health records marked as "Monetizable" can be listed on the marketplace.
                  All data is encrypted and anonymized before sharing.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-800">Monetization Disabled</span>
                  <Badge variant="secondary">Inactive</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Your health data will not be available for monetization.
                  You can enable this feature at any time.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Medical Information */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Medical Information</h2>
          <p className="text-gray-600 mt-1">
            Your medical history and current medications (optional)
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="medicalHistory">Medical History</Label>
            <Textarea
              id="medicalHistory"
              placeholder="Previous conditions, surgeries, family history..."
              value={formData.medical_history || ''}
              onChange={(e) => handleInputChange('medical_history', e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              placeholder="Food allergies, medication allergies..."
              value={formData.allergies || ''}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="medications">Current Medications</Label>
            <Textarea
              id="medications"
              placeholder="Current prescriptions, dosages..."
              value={formData.current_medications || ''}
              onChange={(e) => handleInputChange('current_medications', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Profile Status */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Profile Status</h2>
          <p className="text-gray-600 mt-1">Overview of your profile completion</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {patientProfile ? '100%' : '0%'}
            </div>
            <p className="text-sm text-blue-700">Profile Complete</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">Secure</div>
            <p className="text-sm text-green-700">Data Encrypted</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">Private</div>
            <p className="text-sm text-purple-700">HIPAA Compliant</p>
          </div>
        </div>
      </Card>

      {/* File Management Section */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Files className="h-5 w-5 mr-2" />
                File Management
              </h2>
              <p className="text-gray-600 mt-1">
                Upload, organize, and manage your files securely
              </p>
            </div>
            <Button
              onClick={() => setShowFileManager(!showFileManager)}
              variant={showFileManager ? "secondary" : "primary"}
              className="min-w-[120px]"
            >
              {showFileManager ? 'Hide Manager' : 'Show Manager'}
            </Button>
          </div>
        </div>

        {/* Quick File Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">-</div>
            <p className="text-sm text-blue-700">Total Files</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">-</div>
            <p className="text-sm text-green-700">Storage Used</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">-</div>
            <p className="text-sm text-purple-700">Shared Files</p>
          </div>
        </div>

        {showFileManager && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <FileManager
              className="border-0"
              showProfilePhotoSection={false}
              initialView="all"
            />
          </div>
        )}

        {!showFileManager && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Files className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">File Manager</h3>
            <p className="text-gray-600 mb-4">
              Click "Show Manager" to access your file management interface
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Upload and organize files securely</p>
              <p>• Share files with healthcare providers</p>
              <p>• Manage file permissions and access</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EnhancedPatientProfile;
