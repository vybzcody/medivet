import React, { useState } from 'react';
import useProfileStore from '../../stores/useProfileStore';
import useAuthStore from '../../stores/useAuthStore';
import useFileStore from '../../stores/useFileStore';
import { HealthcareProviderProfile } from '../../types';
import AutocompleteInput from '../ui/AutocompleteInput';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProfilePhotoUpload from '../common/ProfilePhotoUpload';
import { useMedicalData } from '../../hooks/useMedicalData';
import { validateEmail, validateName, validateLicenseNumber, validateAddress, ValidationResult } from '../../utils/validation';
import { User, Mail, Shield, Building, MapPin, Stethoscope, AlertTriangle, Camera } from 'lucide-react';

interface ImprovedProviderOnboardingProps {
  onComplete: () => void;
}

const ImprovedProviderOnboarding: React.FC<ImprovedProviderOnboardingProps> = ({ onComplete }) => {
  const { createHealthcareProviderProfile, isLoading, error } = useProfileStore();
  const { principal } = useAuthStore();
  const { specializationOptions, facilityTypeOptions, cityOptions } = useMedicalData();
  
  const [formData, setFormData] = useState({
    fullName: '',
    specialization: '',
    licenseNumber: '',
    contactInfo: '',
    facilityName: '',
    facilityAddress: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleSpecializationSelect = (specialization: string) => {
    setFormData(prev => ({ ...prev, specialization }));
    if (validationErrors.specialization) {
      setValidationErrors(prev => ({ ...prev, specialization: '' }));
    }
  };
  
  const handleFacilitySelect = (facility: string) => {
    setFormData(prev => ({ ...prev, facilityName: facility }));
    if (validationErrors.facilityName) {
      setValidationErrors(prev => ({ ...prev, facilityName: '' }));
    }
  };
  
  const handleAddressSelect = (address: string) => {
    setFormData(prev => ({ ...prev, facilityAddress: address }));
    if (validationErrors.facilityAddress) {
      setValidationErrors(prev => ({ ...prev, facilityAddress: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!principal) {
      return;
    }

    // Validate form fields
    const errors: Record<string, string> = {};
    
    // Validate required fields
    const nameValidation = validateName(formData.fullName, 'Full Name');
    if (!nameValidation.isValid) {
      errors.fullName = nameValidation.error || 'Invalid name';
    }
    
    if (!formData.specialization.trim() || formData.specialization.length < 2) {
      errors.specialization = 'Specialization must be at least 2 characters';
    }
    
    const licenseValidation = validateLicenseNumber(formData.licenseNumber);
    if (!licenseValidation.isValid) {
      errors.licenseNumber = licenseValidation.error || 'Invalid license number';
    }
    
    const emailValidation = validateEmail(formData.contactInfo);
    if (!emailValidation.isValid) {
      errors.contactInfo = emailValidation.error || 'Invalid contact information';
    }
    
    // Validate optional fields if provided
    if (formData.facilityName && formData.facilityName.length < 2) {
      errors.facilityName = 'Facility name must be at least 2 characters';
    }
    
    if (formData.facilityAddress) {
      const addressValidation = validateAddress(formData.facilityAddress);
      if (!addressValidation.isValid) {
        errors.facilityAddress = addressValidation.error || 'Invalid address';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await createHealthcareProviderProfile(
        formData.fullName,
        formData.specialization,
        formData.licenseNumber,
        formData.contactInfo,
        formData.facilityName || null,
        formData.facilityAddress || null
      );
      onComplete();
    } catch (err) {
      console.error('Failed to create healthcare provider profile:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Healthcare Provider Profile</h3>
        <p className="text-gray-600">
          Please provide your professional information to create your secure healthcare provider profile.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Profile Photo Upload */}
      <Card>
        <div className="flex items-center mb-4">
          <Camera className="w-5 h-5 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-gray-900">Professional Photo</h4>
          <span className="ml-2 text-sm text-gray-500">(Optional)</span>
        </div>
        <div className="flex justify-center">
          <ProfilePhotoUpload
            onUploadComplete={(url) => {
              console.log('Profile photo uploaded successfully:', url);
            }}
            onUploadError={(error) => {
              console.error('Profile photo upload error:', error);
            }}
            size="medium"
            showLabel={false}
          />
        </div>
        <div className="mt-3 text-center text-sm text-gray-600">
          <p>Upload a professional photo for your healthcare provider profile</p>
        </div>
      </Card>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Personal Information</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              error={validationErrors.fullName}
              placeholder="Enter your full name"
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            
            <FormInput
              label="Contact Information"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              error={validationErrors.contactInfo}
              placeholder="Email address or phone number"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
          </div>
        </Card>

        {/* Professional Information */}
        <Card>
          <div className="flex items-center mb-4">
            <Stethoscope className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Professional Information</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Medical Specialization <span className="text-red-500">*</span>
              </label>
              <AutocompleteInput
                options={specializationOptions}
                value={formData.specialization}
                onChange={handleSpecializationSelect}
                placeholder="Type to search specializations..."
                allowCustom={true}
                className={`
                  ${validationErrors.specialization 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }
                `}
              />
              {validationErrors.specialization && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.specialization}</p>
                </div>
              )}
            </div>
            
            <FormInput
              label="Medical License Number"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              error={validationErrors.licenseNumber}
              placeholder="Enter your license number"
              leftIcon={<Shield className="w-4 h-4" />}
              required
            />
          </div>
        </Card>

        {/* Facility Information */}
        <Card>
          <div className="flex items-center mb-4">
            <Building className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Facility Information</h4>
            <span className="ml-2 text-sm text-gray-500">(Optional)</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Facility Name
              </label>
              <AutocompleteInput
                options={facilityTypeOptions}
                value={formData.facilityName}
                onChange={handleFacilitySelect}
                placeholder="Type to search facilities or add custom..."
                allowCustom={true}
                className={`
                  ${validationErrors.facilityName 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }
                `}
              />
              {validationErrors.facilityName && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.facilityName}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Facility Address
              </label>
              <AutocompleteInput
                options={cityOptions}
                value={formData.facilityAddress}
                onChange={handleAddressSelect}
                placeholder="Type to search cities or add custom address..."
                allowCustom={true}
                className={`
                  ${validationErrors.facilityAddress 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }
                `}
              />
              {validationErrors.facilityAddress && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.facilityAddress}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-1">Security & Privacy</h5>
              <p className="text-sm text-blue-700">
                Your professional information is encrypted and stored securely on the Internet Computer. 
                Only patients who explicitly grant you access will be able to share their health records with you.
              </p>
            </div>
          </div>
        </Card>
        
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            isLoading={isLoading}
            size="lg"
            className="min-w-[200px]"
          >
            Complete Profile
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ImprovedProviderOnboarding;
