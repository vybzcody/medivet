// Validation utilities for client-side data sanitization

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

// Email validation and sanitization
export const validateEmail = (email: string): ValidationResult => {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!sanitized) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (sanitized.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true, sanitized };
};

// Phone number validation and sanitization
export const validatePhone = (phone: string): ValidationResult => {
  const sanitized = phone.replace(/\D/g, ''); // Remove all non-digits
  
  if (!sanitized) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  if (sanitized.length < 10 || sanitized.length > 15) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }
  
  // Format US phone numbers
  if (sanitized.length === 10) {
    const formatted = `(${sanitized.slice(0, 3)}) ${sanitized.slice(3, 6)}-${sanitized.slice(6)}`;
    return { isValid: true, sanitized: formatted };
  }
  
  return { isValid: true, sanitized };
};

// Name validation and sanitization
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  const sanitized = name.trim().replace(/\s+/g, ' '); // Remove extra spaces
  
  if (!sanitized) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: `${fieldName} must be less than 100 characters` };
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(sanitized)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { isValid: true, sanitized };
};

// Date validation
export const validateDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  
  // Check if date is not in the future (for birth dates, etc.)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj > today) {
    return { isValid: false, error: `${fieldName} cannot be in the future` };
  }
  
  // Check if date is not too far in the past (reasonable birth date)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 150);
  if (dateObj < minDate) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  
  return { isValid: true, sanitized: date };
};

// Future date validation
export const validateFutureDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  
  // Check if date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return { isValid: false, error: `${fieldName} cannot be in the past` };
  }
  
  return { isValid: true, sanitized: date };
};

// Medical text validation (for symptoms, conditions, etc.)
export const validateMedicalText = (text: string, fieldName: string = 'Text', maxLength: number = 1000): ValidationResult => {
  const sanitized = text.trim().replace(/\s+/g, ' '); // Remove extra spaces
  
  if (!sanitized) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  // Basic sanitization - remove potentially harmful characters but allow medical terms
  const cleanText = sanitized.replace(/[<>\"']/g, '');
  
  return { isValid: true, sanitized: cleanText };
};

// License number validation
export const validateLicenseNumber = (license: string): ValidationResult => {
  const sanitized = license.trim().toUpperCase();
  
  if (!sanitized) {
    return { isValid: false, error: 'License number is required' };
  }
  
  if (sanitized.length < 3 || sanitized.length > 20) {
    return { isValid: false, error: 'License number must be between 3 and 20 characters' };
  }
  
  // Allow alphanumeric characters, hyphens, and spaces
  const licenseRegex = /^[A-Z0-9\s\-]+$/;
  if (!licenseRegex.test(sanitized)) {
    return { isValid: false, error: 'License number can only contain letters, numbers, hyphens, and spaces' };
  }
  
  return { isValid: true, sanitized };
};

// Address validation
export const validateAddress = (address: string): ValidationResult => {
  const sanitized = address.trim().replace(/\s+/g, ' ');
  
  if (!sanitized) {
    return { isValid: false, error: 'Address is required' };
  }
  
  if (sanitized.length < 5) {
    return { isValid: false, error: 'Please enter a complete address' };
  }
  
  if (sanitized.length > 200) {
    return { isValid: false, error: 'Address must be less than 200 characters' };
  }
  
  return { isValid: true, sanitized };
};

// Generic text sanitization
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>\"']/g, ''); // Remove potentially harmful characters
};

// Validate required field
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  const sanitized = value.trim();
  
  if (!sanitized) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true, sanitized };
};

// Validate medication dosage
export const validateDosage = (dosage: string): ValidationResult => {
  const sanitized = dosage.trim();
  
  if (!sanitized) {
    return { isValid: false, error: 'Dosage is required' };
  }
  
  // Allow numbers, letters, spaces, and common dosage symbols
  const dosageRegex = /^[0-9a-zA-Z\s\.\-\/\(\)mg|ML|mcg|IU|%]+$/i;
  if (!dosageRegex.test(sanitized)) {
    return { isValid: false, error: 'Please enter a valid dosage (e.g., "10mg", "1 tablet")' };
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: 'Dosage must be less than 50 characters' };
  }
  
  return { isValid: true, sanitized };
};

// Validate frequency (how often medication is taken)
export const validateFrequency = (frequency: string): ValidationResult => {
  const sanitized = frequency.trim();
  
  if (!sanitized) {
    return { isValid: false, error: 'Frequency is required' };
  }
  
  const commonFrequencies = [
    'once daily', 'twice daily', 'three times daily', 'four times daily',
    'every 4 hours', 'every 6 hours', 'every 8 hours', 'every 12 hours',
    'as needed', 'before meals', 'after meals', 'at bedtime',
    'weekly', 'monthly', 'as directed'
  ];
  
  const isCommonFrequency = commonFrequencies.some(freq => 
    sanitized.toLowerCase().includes(freq) || freq.includes(sanitized.toLowerCase())
  );
  
  if (!isCommonFrequency && sanitized.length > 100) {
    return { isValid: false, error: 'Frequency must be less than 100 characters' };
  }
  
  return { isValid: true, sanitized };
};

// Comprehensive form validation
export const validateForm = (data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
} => {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field] || '');
    if (!result.isValid) {
      errors[field] = result.error || 'Invalid value';
    } else {
      sanitizedData[field] = result.sanitized || data[field];
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};
