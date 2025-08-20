import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import useProfileStore from '../../stores/useProfileStore';
import useAuthStore from '../../stores/useAuthStore';
import useFileStore from '../../stores/useFileStore';
import { PatientProfile } from '../../types';
import AutocompleteInput from '../ui/AutocompleteInput';
import ItemChips from '../ui/ItemChips';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProfilePhotoUpload from '../common/ProfilePhotoUpload';
import { useMedicalData } from '../../hooks/useMedicalData';
import { validateEmail, validateName, validateDate, validateMedicalText, ValidationResult } from '../../utils/validation';
import { User, Mail, Phone, Calendar, Heart, AlertTriangle, Pill, Camera, Users, Droplet } from 'lucide-react';

interface ImprovedPatientOnboardingProps {
  onComplete: () => void;
}

const ImprovedPatientOnboarding: React.FC<ImprovedPatientOnboardingProps> = ({ onComplete }) => {
  const { createPatientProfile, isLoading, error } = useProfileStore();
  const { principal } = useAuthStore();
  const { conditionOptions, medicationOptions, symptomOptions } = useMedicalData();
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    contactInfo: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
  });
  
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');

  // Create comprehensive allergy options
  const allergyOptions = [
    // Food Allergies
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'tree_nuts', label: 'Tree Nuts (Almonds, Walnuts, etc.)' },
    { value: 'shellfish', label: 'Shellfish' },
    { value: 'fish', label: 'Fish' },
    { value: 'eggs', label: 'Eggs' },
    { value: 'milk', label: 'Milk/Dairy' },
    { value: 'soy', label: 'Soy' },
    { value: 'wheat', label: 'Wheat/Gluten' },
    { value: 'sesame', label: 'Sesame' },
    
    // Drug Allergies
    { value: 'penicillin', label: 'Penicillin' },
    { value: 'aspirin', label: 'Aspirin' },
    { value: 'ibuprofen', label: 'Ibuprofen' },
    { value: 'codeine', label: 'Codeine' },
    { value: 'morphine', label: 'Morphine' },
    { value: 'sulfa', label: 'Sulfa drugs' },
    
    // Environmental Allergies
    { value: 'pollen', label: 'Pollen' },
    { value: 'dust_mites', label: 'Dust Mites' },
    { value: 'pet_dander', label: 'Pet Dander' },
    { value: 'mold', label: 'Mold' },
    { value: 'latex', label: 'Latex' },
    { value: 'bee_stings', label: 'Bee Stings' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDateOfBirth(date);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
      
      // Clear validation error
      if (validationErrors.dateOfBirth) {
        setValidationErrors(prev => ({ ...prev, dateOfBirth: '' }));
      }
    }
  };

  const handleConditionAdd = () => {
    const condition = conditionInput.trim();
    if (condition && !selectedConditions.includes(condition)) {
      const newConditions = [...selectedConditions, condition];
      setSelectedConditions(newConditions);
      updateFormDataFromArray('medicalHistory', newConditions);
      setConditionInput('');
    }
  };

  const handleConditionRemove = (index: number) => {
    const newConditions = selectedConditions.filter((_, i) => i !== index);
    setSelectedConditions(newConditions);
    updateFormDataFromArray('medicalHistory', newConditions);
  };

  const handleMedicationAdd = () => {
    const medication = medicationInput.trim();
    if (medication && !selectedMedications.includes(medication)) {
      const newMedications = [...selectedMedications, medication];
      setSelectedMedications(newMedications);
      updateFormDataFromArray('currentMedications', newMedications);
      setMedicationInput('');
    }
  };

  const handleMedicationRemove = (index: number) => {
    const newMedications = selectedMedications.filter((_, i) => i !== index);
    setSelectedMedications(newMedications);
    updateFormDataFromArray('currentMedications', newMedications);
  };

  const handleAllergyAdd = () => {
    const allergy = allergyInput.trim();
    if (allergy && !selectedAllergies.includes(allergy)) {
      const newAllergies = [...selectedAllergies, allergy];
      setSelectedAllergies(newAllergies);
      updateFormDataFromArray('allergies', newAllergies);
      setAllergyInput('');
    }
  };

  const handleAllergyRemove = (index: number) => {
    const newAllergies = selectedAllergies.filter((_, i) => i !== index);
    setSelectedAllergies(newAllergies);
    updateFormDataFromArray('allergies', newAllergies);
  };

  const updateFormDataFromArray = (field: string, array: string[]) => {
    setFormData(prev => ({ ...prev, [field]: array.join(', ') }));
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
    
    const dateValidation = validateDate(formData.dateOfBirth, 'Date of Birth');
    if (!dateValidation.isValid) {
      errors.dateOfBirth = dateValidation.error || 'Invalid date';
    } else {
      // Check minimum age of 16 years
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        if (age - 1 < 16) {
          errors.dateOfBirth = 'You must be at least 16 years old to register';
        }
      } else if (age < 16) {
        errors.dateOfBirth = 'You must be at least 16 years old to register';
      }
    }
    
    // Validate gender (required)
    if (!formData.gender.trim()) {
      errors.gender = 'Please select your gender';
    }
    
    const emailValidation = validateEmail(formData.contactInfo);
    if (!emailValidation.isValid) {
      errors.contactInfo = emailValidation.error || 'Invalid contact information';
    }
    
    if (!formData.emergencyContact.trim() || formData.emergencyContact.length < 5) {
      errors.emergencyContact = 'Emergency contact must be at least 5 characters';
    }
    
    // Validate optional medical fields if provided
    if (formData.medicalHistory) {
      const historyValidation = validateMedicalText(formData.medicalHistory, 'Medical History');
      if (!historyValidation.isValid) {
        errors.medicalHistory = historyValidation.error || 'Invalid medical history';
      }
    }
    
    if (formData.allergies) {
      const allergyValidation = validateMedicalText(formData.allergies, 'Allergies');
      if (!allergyValidation.isValid) {
        errors.allergies = allergyValidation.error || 'Invalid allergy information';
      }
    }
    
    if (formData.currentMedications) {
      const medicationValidation = validateMedicalText(formData.currentMedications, 'Current Medications');
      if (!medicationValidation.isValid) {
        errors.currentMedications = medicationValidation.error || 'Invalid medication information';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await createPatientProfile(
        formData.fullName,
        formData.dateOfBirth,
        formData.contactInfo,
        formData.emergencyContact,
        formData.medicalHistory || null,
        formData.allergies || null,
        formData.currentMedications || null,
        formData.gender,
        formData.bloodGroup || null
      );
      onComplete();
    } catch (err) {
      console.error('Failed to create patient profile:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Patient Profile</h3>
        <p className="text-gray-600">
          Please provide your information to create a secure, encrypted health profile.
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
          <h4 className="text-lg font-semibold text-gray-900">Profile Photo</h4>
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
          <p>Upload a clear photo of yourself for easy identification</p>
        </div>
      </Card>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Basic Information</h4>
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
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <DatePicker
                  selected={dateOfBirth}
                  onChange={handleDateChange}
                  dateFormat="yyyy-MM-dd"
                  className={`
                    block w-full rounded-lg border transition-colors duration-200 pl-10 pr-3 py-2.5
                    ${validationErrors.dateOfBirth 
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                  placeholderText="YYYY-MM-DD"
                  maxDate={new Date()}
                  showYearDropdown
                  dropdownMode="select"
                />
              </div>
              {validationErrors.dateOfBirth && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.dateOfBirth}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`
                    block w-full rounded-lg border transition-colors duration-200 pl-10 pr-8 py-2.5 appearance-none bg-white
                    ${validationErrors.gender 
                      ? 'border-red-300 text-red-900 focus:outline-none focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {validationErrors.gender && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.gender}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Blood Group <span className="text-sm text-gray-500">(Optional)</span>
              </label>
              <div className="relative">
                <Droplet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-300 transition-colors duration-200 pl-10 pr-8 py-2.5 appearance-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="unknown">Unknown</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            
            <FormInput
              label="Emergency Contact"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              error={validationErrors.emergencyContact}
              placeholder="Name and phone number"
              leftIcon={<Phone className="w-4 h-4" />}
              required
            />
          </div>
        </Card>

        {/* Medical Information */}
        <Card>
          <div className="flex items-center mb-4">
            <Heart className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Medical Information</h4>
            <span className="ml-2 text-sm text-gray-500">(Optional)</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical History & Conditions
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <AutocompleteInput
                    options={conditionOptions}
                    value={conditionInput}
                    onChange={setConditionInput}
                    placeholder="Type to search conditions or add custom..."
                    allowCustom={true}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleConditionAdd}
                    disabled={!conditionInput.trim()}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                <ItemChips 
                  items={selectedConditions}
                  onRemove={handleConditionRemove}
                  label="Added conditions"
                />
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  rows={3}
                  className={`
                    w-full p-3 border rounded-lg transition-colors duration-200
                    ${validationErrors.medicalHistory 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                    focus:outline-none
                  `}
                  placeholder="Describe your medical history, chronic conditions, past surgeries, etc."
                />
                {validationErrors.medicalHistory && (
                  <div className="flex items-start space-x-1">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{validationErrors.medicalHistory}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Allergies & Medications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Allergies</h4>
              <span className="ml-2 text-sm text-gray-500">(Optional)</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <AutocompleteInput
                  options={allergyOptions}
                  value={allergyInput}
                  onChange={setAllergyInput}
                  placeholder="Type to search allergies..."
                  allowCustom={true}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAllergyAdd}
                  disabled={!allergyInput.trim()}
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <ItemChips 
                items={selectedAllergies}
                onRemove={handleAllergyRemove}
                label="Added allergies"
              />
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                rows={3}
                className={`
                  w-full p-3 border rounded-lg transition-colors duration-200
                  ${validationErrors.allergies 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }
                  focus:outline-none
                `}
                placeholder="Food allergies, drug allergies, environmental allergies"
              />
              {validationErrors.allergies && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.allergies}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center mb-4">
              <Pill className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Current Medications</h4>
              <span className="ml-2 text-sm text-gray-500">(Optional)</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <AutocompleteInput
                  options={medicationOptions}
                  value={medicationInput}
                  onChange={setMedicationInput}
                  placeholder="Type to search medications..."
                  allowCustom={true}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleMedicationAdd}
                  disabled={!medicationInput.trim()}
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <ItemChips 
                items={selectedMedications}
                onRemove={handleMedicationRemove}
                label="Added medications"
              />
              <textarea
                name="currentMedications"
                value={formData.currentMedications}
                onChange={handleChange}
                rows={3}
                className={`
                  w-full p-3 border rounded-lg transition-colors duration-200
                  ${validationErrors.currentMedications 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }
                  focus:outline-none
                `}
                placeholder="Prescription medications, supplements, over-the-counter drugs"
              />
              {validationErrors.currentMedications && (
                <div className="flex items-start space-x-1">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{validationErrors.currentMedications}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        
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

export default ImprovedPatientOnboarding;
