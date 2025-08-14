import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Textarea from '../ui/Textarea';
import Badge from '../ui/Badge';
import {
  User,
  Save,
  Shield,
  Building,
  Award,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  FileText
} from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import { HealthcareProviderProfile as ProviderProfileType } from '../../types';

const EnhancedProviderProfile: React.FC = () => {
  const { principal } = useAuthStore();
  const { healthcareProviderProfile, updateHealthcareProviderProfile, isLoading } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProviderProfileType>>({
    full_name: '',
    specialization: '',
    license_number: '',
    contact_info: '',
    facility_name: '',
    facility_address: '',
  });

  useEffect(() => {
    if (healthcareProviderProfile) {
      setFormData({
        full_name: healthcareProviderProfile.full_name || '',
        specialization: healthcareProviderProfile.specialization || '',
        license_number: healthcareProviderProfile.license_number || '',
        contact_info: healthcareProviderProfile.contact_info || '',
        facility_name: healthcareProviderProfile.facility_name || '',
        facility_address: healthcareProviderProfile.facility_address || '',
      });
    }
  }, [healthcareProviderProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHealthcareProviderProfile(
        formData.full_name || '',
        formData.specialization || '',
        formData.license_number || '',
        formData.contact_info || '',
        formData.facility_name || '',
        formData.facility_address || ''
      );
      console.log('Provider profile updated successfully!');
    } catch (error) {
      console.error('Failed to update provider profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProviderProfileType, value: string) => {
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
          <h1 className="text-3xl font-bold text-gray-900">Provider Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your professional information and credentials
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Professional Information */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Professional Information
            </h2>
            <p className="text-gray-600 mt-1">
              Your medical credentials and specialization
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="fullName"
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Dr. John Smith"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="specialization"
                  value={formData.specialization || ''}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="Cardiology, Internal Medicine, etc."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="licenseNumber"
                  value={formData.license_number || ''}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  placeholder="Medical license number"
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
                  placeholder="doctor@hospital.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Facility Information */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Facility Information
            </h2>
            <p className="text-gray-600 mt-1">
              Your practice or hospital details
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="facilityName">Facility Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="facilityName"
                  value={formData.facility_name || ''}
                  onChange={(e) => handleInputChange('facility_name', e.target.value)}
                  placeholder="General Hospital, Private Practice, etc."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="facilityAddress">Facility Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                <Textarea
                  id="facilityAddress"
                  value={formData.facility_address || ''}
                  onChange={(e) => handleInputChange('facility_address', e.target.value)}
                  placeholder="123 Medical Center Dr, City, State, ZIP"
                  rows={3}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Verification Status */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            Verification Status
          </h2>
          <p className="text-gray-600 mt-1">
            Your professional verification and compliance status
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-lg font-bold text-green-600">Verified</div>
            <p className="text-sm text-green-700">Professional License</p>
            <Badge variant="success" className="mt-2">Active</Badge>
          </div>

          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-600">Compliant</div>
            <p className="text-sm text-blue-700">HIPAA Certified</p>
            <Badge variant="default" className="mt-2">Current</Badge>
          </div>

          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-600">Trusted</div>
            <p className="text-sm text-purple-700">Platform Member</p>
            <Badge variant="secondary" className="mt-2">Good Standing</Badge>
          </div>
        </div>
      </Card>

      {/* Access Permissions */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Data Access Permissions</h2>
          <p className="text-gray-600 mt-1">
            Types of patient data you can access based on granted permissions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-sm font-medium text-gray-900">Basic Info</div>
            <div className="text-xs text-gray-600 mt-1">Name, DOB, Contact</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-sm font-medium text-gray-900">Medical History</div>
            <div className="text-xs text-gray-600 mt-1">Past conditions</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-sm font-medium text-gray-900">Allergies</div>
            <div className="text-xs text-gray-600 mt-1">Known allergies</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-sm font-medium text-gray-900">Medications</div>
            <div className="text-xs text-gray-600 mt-1">Current prescriptions</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedProviderProfile;
