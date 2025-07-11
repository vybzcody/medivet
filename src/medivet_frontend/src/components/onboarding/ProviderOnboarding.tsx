import React, { useState } from 'react';
import useProfileStore from '../../stores/useProfileStore';
import useAuthStore from '../../stores/useAuthStore';
import { HealthcareProviderProfile } from '../../types';
import AutocompleteInput from '../ui/AutocompleteInput';
import { useMedicalData } from '../../hooks/useMedicalData';
import { validateEmail, validateName, validateLicenseNumber, validateAddress, ValidationResult } from '../../utils/validation';

interface ProviderOnboardingProps {
  onComplete: () => void;
}

const ProviderOnboarding: React.FC<ProviderOnboardingProps> = ({ onComplete }) => {
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Your Healthcare Provider Profile</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className={`w-full p-2 border rounded-md ${
                validationErrors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {validationErrors.fullName && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical Specialization <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              options={specializationOptions}
              value={formData.specialization}
              onChange={handleSpecializationSelect}
              placeholder="Select your medical specialization"
              allowCustom={true}
              error={validationErrors.specialization}
              className="w-full"
            />
            {validationErrors.specialization && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.specialization}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical License Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
              className={`w-full p-2 border rounded-md ${
                validationErrors.licenseNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your medical license number"
            />
            {validationErrors.licenseNumber && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.licenseNumber}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Information <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              required
              placeholder="Email address or phone number"
              className={`w-full p-2 border rounded-md ${
                validationErrors.contactInfo ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validationErrors.contactInfo && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.contactInfo}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Healthcare Facility Name
            </label>
            <AutocompleteInput
              options={facilityTypeOptions}
              value={formData.facilityName}
              onChange={handleFacilitySelect}
              placeholder="Hospital, Clinic, Private Practice, etc."
              allowCustom={true}
              error={validationErrors.facilityName}
              className="w-full"
            />
            {validationErrors.facilityName && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.facilityName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Address
            </label>
            <AutocompleteInput
              options={cityOptions}
              value={formData.facilityAddress}
              onChange={handleAddressSelect}
              placeholder="City, State/Province, Country"
              allowCustom={true}
              error={validationErrors.facilityAddress}
              className="w-full"
            />
            {validationErrors.facilityAddress && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.facilityAddress}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Complete Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderOnboarding;
