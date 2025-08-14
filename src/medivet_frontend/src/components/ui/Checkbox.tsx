import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ 
  id,
  checked, 
  onCheckedChange, 
  disabled = false, 
  className = '' 
}) => {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`
        peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 
        ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'}
        ${className}
      `}
    >
      {checked && (
        <Check className="h-3 w-3" />
      )}
    </button>
  );
};

export default Checkbox;
