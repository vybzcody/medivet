import { useMemo } from 'react';
import medicationsData from '../data/medications.json';
import conditionsData from '../data/conditions.json';
import specializationsData from '../data/specializations.json';
import citiesData from '../data/cities.json';

interface AutocompleteOption {
  value: string;
  label: string;
  category?: string;
  description?: string;
}

export const useMedicalData = () => {
  // Medications autocomplete options
  const medicationOptions = useMemo((): AutocompleteOption[] => {
    return medicationsData.common_medications.map(med => ({
      value: med.name,
      label: med.name,
      category: med.category,
      description: med.brand_names?.length > 0 ? `Brand names: ${med.brand_names.join(', ')}` : undefined
    }));
  }, []);

  // Conditions autocomplete options
  const conditionOptions = useMemo((): AutocompleteOption[] => {
    return conditionsData.common_conditions.map(condition => ({
      value: condition.name,
      label: condition.name,
      category: condition.category,
      description: condition.icd10 ? `ICD-10: ${condition.icd10}` : undefined
    }));
  }, []);

  // Symptoms autocomplete options
  const symptomOptions = useMemo((): AutocompleteOption[] => {
    const allSymptoms = new Set<string>();
    
    conditionsData.common_conditions.forEach(condition => {
      condition.symptoms?.forEach(symptom => allSymptoms.add(symptom));
    });

    return Array.from(allSymptoms).map(symptom => ({
      value: symptom,
      label: symptom,
      category: 'Symptom'
    }));
  }, []);

  // Medical specializations
  const specializationOptions = useMemo((): AutocompleteOption[] => {
    return specializationsData.medical_specializations.map(spec => ({
      value: spec.name,
      label: spec.name,
      description: spec.description
    }));
  }, []);

  // Facility types
  const facilityTypeOptions = useMemo((): AutocompleteOption[] => {
    return specializationsData.facility_types.map(type => ({
      value: type,
      label: type,
      category: 'Facility Type'
    }));
  }, []);

  // Cities autocomplete options
  const cityOptions = useMemo((): AutocompleteOption[] => {
    const allCities: AutocompleteOption[] = [];
    
    citiesData.countries.forEach(country => {
      country.cities.forEach(city => {
        allCities.push({
          value: `${city}, ${country.name}`,
          label: city,
          category: country.name,
          description: `${city}, ${country.name}`
        });
      });
    });

    return allCities;
  }, []);

  // Common locations
  const locationOptions = useMemo((): AutocompleteOption[] => {
    return citiesData.common_locations.map(location => ({
      value: location,
      label: location,
      category: 'Common Location'
    }));
  }, []);

  // Dosage forms
  const dosageFormOptions = useMemo((): AutocompleteOption[] => {
    const allForms = new Set<string>();
    
    medicationsData.common_medications.forEach(med => {
      med.dosage_forms?.forEach(form => allForms.add(form));
    });

    return Array.from(allForms).map(form => ({
      value: form,
      label: form,
      category: 'Dosage Form'
    }));
  }, []);

  // Common frequencies for medications
  const frequencyOptions = useMemo((): AutocompleteOption[] => {
    const frequencies = [
      'Once daily',
      'Twice daily', 
      'Three times daily',
      'Four times daily',
      'Every 4 hours',
      'Every 6 hours',
      'Every 8 hours',
      'Every 12 hours',
      'As needed',
      'Before meals',
      'After meals',
      'With meals',
      'At bedtime',
      'In the morning',
      'In the evening',
      'Weekly',
      'Monthly',
      'As directed by physician'
    ];

    return frequencies.map(freq => ({
      value: freq,
      label: freq,
      category: 'Frequency'
    }));
  }, []);

  // Medical record categories
  const recordCategoryOptions = useMemo((): AutocompleteOption[] => {
    const categories = [
      'General Health',
      'Chronic Conditions',
      'Medications',
      'Allergies',
      'Immunizations',
      'Lab Results',
      'Imaging',
      'Procedures',
      'Mental Health',
      'Emergency',
      'Preventive Care',
      'Specialist Consultation',
      'Hospital Admission',
      'Surgery',
      'Physical Therapy',
      'Other'
    ];

    return categories.map(category => ({
      value: category,
      label: category,
      category: 'Record Category'
    }));
  }, []);

  // Record types
  const recordTypeOptions = useMemo((): AutocompleteOption[] => {
    const types = [
      'Visit Note',
      'Lab Report',
      'Imaging Report',
      'Prescription',
      'Discharge Summary',
      'Consultation Note',
      'Procedure Note',
      'Progress Note',
      'Assessment',
      'Treatment Plan',
      'Referral',
      'Insurance Document',
      'Personal Note',
      'Other'
    ];

    return types.map(type => ({
      value: type,
      label: type,
      category: 'Record Type'
    }));
  }, []);

  // Search function for any dataset
  const searchOptions = (options: AutocompleteOption[], query: string, limit: number = 10): AutocompleteOption[] => {
    if (!query.trim()) return options.slice(0, limit);
    
    const searchTerm = query.toLowerCase();
    return options
      .filter(option => 
        option.label.toLowerCase().includes(searchTerm) ||
        option.value.toLowerCase().includes(searchTerm) ||
        (option.description && option.description.toLowerCase().includes(searchTerm)) ||
        (option.category && option.category.toLowerCase().includes(searchTerm))
      )
      .slice(0, limit);
  };

  // Get medication by name
  const getMedicationByName = (name: string) => {
    return medicationsData.common_medications.find(med => 
      med.name.toLowerCase() === name.toLowerCase()
    );
  };

  // Get condition by name
  const getConditionByName = (name: string) => {
    return conditionsData.common_conditions.find(condition => 
      condition.name.toLowerCase() === name.toLowerCase()
    );
  };

  // Get related conditions by symptom
  const getConditionsBySymptom = (symptom: string) => {
    return conditionsData.common_conditions.filter(condition =>
      condition.symptoms?.some(s => 
        s.toLowerCase().includes(symptom.toLowerCase())
      )
    );
  };

  // Get medications by category
  const getMedicationsByCategory = (category: string) => {
    return medicationsData.common_medications.filter(med =>
      med.category.toLowerCase() === category.toLowerCase()
    );
  };

  return {
    // Options for autocomplete components
    medicationOptions,
    conditionOptions,
    symptomOptions,
    specializationOptions,
    facilityTypeOptions,
    cityOptions,
    locationOptions,
    dosageFormOptions,
    frequencyOptions,
    recordCategoryOptions,
    recordTypeOptions,
    
    // Utility functions
    searchOptions,
    getMedicationByName,
    getConditionByName,
    getConditionsBySymptom,
    getMedicationsByCategory,
    
    // Raw data access
    medications: medicationsData.common_medications,
    conditions: conditionsData.common_conditions,
    specializations: specializationsData.medical_specializations,
    facilityTypes: specializationsData.facility_types,
    countries: citiesData.countries,
    commonLocations: citiesData.common_locations
  };
};
