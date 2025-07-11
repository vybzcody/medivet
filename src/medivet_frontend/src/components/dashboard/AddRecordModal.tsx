import React, { useState } from 'react';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import AutocompleteInput from '../ui/AutocompleteInput';
import { useMedicalData } from '../../hooks/useMedicalData';
import { validateForm, validateRequired, validateMedicalText } from '../../utils/validation';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddRecordModal: React.FC<AddRecordModalProps> = ({ isOpen, onClose }) => {
  const { createRecord, isLoading, error } = useHealthRecordStore();
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    provider: '',
    recordType: '',
    content: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const {
    recordCategoryOptions,
    recordTypeOptions,
    specializationOptions,
    facilityTypeOptions,
    conditionOptions,
    medicationOptions,
    symptomOptions
  } = useMedicalData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateFormData = () => {
    const validationRules = {
      title: (value: string) => validateRequired(value, 'Title'),
      category: (value: string) => validateRequired(value, 'Category'),
      provider: (value: string) => validateRequired(value, 'Healthcare Provider'),
      recordType: (value: string) => validateRequired(value, 'Record Type'),
      content: (value: string) => validateMedicalText(value, 'Content', 2000)
    };

    const result = validateForm(formData, validationRules);
    setValidationErrors(result.errors);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateFormData();
    if (!validation.isValid) {
      return;
    }

    try {
      await createRecord(
        validation.sanitizedData.title,
        validation.sanitizedData.category,
        validation.sanitizedData.provider,
        validation.sanitizedData.recordType,
        validation.sanitizedData.content
      );
      
      // Reset form and close modal on success
      setFormData({
        title: '',
        category: '',
        provider: '',
        recordType: '',
        content: '',
      });
      setValidationErrors({});
      onClose();
    } catch (err) {
      console.error('Failed to create health record:', err);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      category: '',
      provider: '',
      recordType: '',
      content: '',
    });
    setValidationErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add New Health Record</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${
                    validationErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Annual Physical Exam, Blood Test Results"
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <AutocompleteInput
                  label="Category"
                  value={formData.category}
                  onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  options={recordCategoryOptions}
                  placeholder="Select or type a category"
                  required
                  error={validationErrors.category}
                  allowCustom={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Healthcare Provider <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${
                    validationErrors.provider ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Dr. Smith, City Hospital"
                />
                {validationErrors.provider && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.provider}</p>
                )}
              </div>

              <div>
                <AutocompleteInput
                  label="Record Type"
                  value={formData.recordType}
                  onChange={(value) => setFormData(prev => ({ ...prev, recordType: value }))}
                  options={recordTypeOptions}
                  placeholder="Select or type a record type"
                  required
                  error={validationErrors.recordType}
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Quick Add Sections */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Add (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AutocompleteInput
                  label="Conditions/Diagnoses"
                  value=""
                  onChange={(value) => {
                    if (value) {
                      const currentContent = formData.content;
                      const newContent = currentContent ? `${currentContent}\n\nCondition: ${value}` : `Condition: ${value}`;
                      setFormData(prev => ({ ...prev, content: newContent }));
                    }
                  }}
                  options={conditionOptions}
                  placeholder="Add condition..."
                  allowCustom={true}
                />
                
                <AutocompleteInput
                  label="Medications"
                  value=""
                  onChange={(value) => {
                    if (value) {
                      const currentContent = formData.content;
                      const newContent = currentContent ? `${currentContent}\n\nMedication: ${value}` : `Medication: ${value}`;
                      setFormData(prev => ({ ...prev, content: newContent }));
                    }
                  }}
                  options={medicationOptions}
                  placeholder="Add medication..."
                  allowCustom={true}
                />
                
                <AutocompleteInput
                  label="Symptoms"
                  value=""
                  onChange={(value) => {
                    if (value) {
                      const currentContent = formData.content;
                      const newContent = currentContent ? `${currentContent}\n\nSymptom: ${value}` : `Symptom: ${value}`;
                      setFormData(prev => ({ ...prev, content: newContent }));
                    }
                  }}
                  options={symptomOptions}
                  placeholder="Add symptom..."
                  allowCustom={true}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select items above to quickly add them to your record content below.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={8}
                className={`w-full p-3 border rounded-md resize-y ${
                  validationErrors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter the health record details, diagnosis, treatment notes, lab results, etc.\n\nExample:\nChief Complaint: Annual physical examination\nVital Signs: BP 120/80, HR 72, Temp 98.6°F\nAssessment: Patient in good health\nPlan: Continue current medications, return in 1 year"
              />
              {validationErrors.content && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.content}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum 2000 characters. Use the quick add sections above to easily include common medical terms.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecordModal;
