import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import useProfileStore from '../../stores/useProfileStore';
import useAuthStore from '../../stores/useAuthStore';
import { PatientProfile } from '../../types';
import AutocompleteInput from '../ui/AutocompleteInput';
import ItemChips from '../ui/ItemChips';
import { useMedicalData } from '../../hooks/useMedicalData';
import { validateEmail, validateName, validateDate, validateMedicalText, ValidationResult } from '../../utils/validation';

interface PatientOnboardingProps {
  onComplete: () => void;
}

const PatientOnboarding: React.FC<PatientOnboardingProps> = ({ onComplete }) => {
  const { createPatientProfile, isLoading, error } = useProfileStore();
  const { principal } = useAuthStore();
  const { conditionOptions, medicationOptions, symptomOptions } = useMedicalData();
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
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
    { value: 'sulfa', label: 'Sulfa Drugs' },
    { value: 'codeine', label: 'Codeine' },
    { value: 'morphine', label: 'Morphine' },
    { value: 'contrast_dye', label: 'Contrast Dye/Iodine' },
    
    // Environmental Allergies
    { value: 'pollen', label: 'Pollen' },
    { value: 'dust_mites', label: 'Dust Mites' },
    { value: 'pet_dander', label: 'Pet Dander' },
    { value: 'mold', label: 'Mold' },
    { value: 'latex', label: 'Latex' },
    { value: 'insect_stings', label: 'Insect Stings/Bites' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
  };
  
  const handleDateChange = (date: Date | null) => {
    setDateOfBirth(date);
    if (date) {
      setFormData(prev => ({ ...prev, dateOfBirth: date.toISOString().split('T')[0] }));
      // Clear validation error when a valid date is selected
      if (validationErrors.dateOfBirth) {
        setValidationErrors(prev => ({ ...prev, dateOfBirth: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };
  
  const handleConditionAdd = () => {
    const condition = conditionInput.trim();
    if (condition && !selectedConditions.includes(condition)) {
      const newConditions = [...selectedConditions, condition];
      setSelectedConditions(newConditions);
      updateFormDataFromArray('medicalHistory', newConditions);
      setConditionInput(''); // Clear input after adding
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
      setMedicationInput(''); // Clear input after adding
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
      setAllergyInput(''); // Clear input after adding
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
        formData.currentMedications || null
      );
      onComplete();
    } catch (err) {
      console.error('Failed to create patient profile:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Your Patient Profile</h2>
      
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
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={dateOfBirth}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              className={`w-full p-2 border rounded-md ${
                validationErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholderText="YYYY-MM-DD"
              maxDate={new Date()}
              showYearDropdown
              dropdownMode="select"
            />
            {validationErrors.dateOfBirth && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.dateOfBirth}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              required
              placeholder="Name and phone number"
              className={`w-full p-2 border rounded-md ${
                validationErrors.emergencyContact ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validationErrors.emergencyContact && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.emergencyContact}</p>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medical History
          </label>
          <div className="mb-2">
            <div className="flex gap-2">
              <AutocompleteInput
                options={conditionOptions}
                value={conditionInput}
                onChange={setConditionInput}
                placeholder="Type to search conditions or add custom..."
                allowCustom={true}
                className="flex-1"
              />
              <button
                type="button"
                onClick={handleConditionAdd}
                disabled={!conditionInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
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
              className={`w-full p-2 border rounded-md ${
                validationErrors.medicalHistory ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe your medical history, chronic conditions, past surgeries, etc."
            />
            {validationErrors.medicalHistory && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.medicalHistory}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allergies
            </label>
            <div className="mb-2">
              <div className="flex gap-2">
                <AutocompleteInput
                  options={allergyOptions}
                  value={allergyInput}
                  onChange={setAllergyInput}
                  placeholder="Type to search allergies or add custom..."
                  allowCustom={true}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={handleAllergyAdd}
                  disabled={!allergyInput.trim()}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
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
                className={`w-full p-2 border rounded-md ${
                  validationErrors.allergies ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Food allergies, drug allergies, environmental allergies"
              />
              {validationErrors.allergies && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.allergies}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Medications
              </label>
              <div className="mb-2">
                <div className="flex gap-2">
                  <AutocompleteInput
                    options={medicationOptions}
                    value={medicationInput}
                    onChange={setMedicationInput}
                    placeholder="Type to search medications or add custom..."
                    allowCustom={true}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleMedicationAdd}
                    disabled={!medicationInput.trim()}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
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
                  className={`w-full p-2 border rounded-md ${
                    validationErrors.currentMedications ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Prescription medications, supplements, over-the-counter drugs"
                />
                {validationErrors.currentMedications && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.currentMedications}</p>
                )}
              </div>
            </div>
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

export default PatientOnboarding;
