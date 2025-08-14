import React, { forwardRef } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

/**
 * FormInput component provides a consistent, accessible input field with validation styling
 * @param label - Input label text
 * @param error - Error message to display
 * @param helperText - Helper text to display below input
 * @param leftIcon - Icon to display on the left side of input
 * @param rightIcon - Icon to display on the right side of input
 * @param isPassword - Whether this is a password input
 * @param showPasswordToggle - Whether to show password visibility toggle
 * @param containerClassName - Additional classes for the container
 */
const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  isPassword = false,
  showPasswordToggle = false,
  containerClassName = '',
  className = '',
  type = 'text',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasError = !!error;
  
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label 
          htmlFor={props.id} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          className={`
            block w-full rounded-lg border transition-colors duration-200
            ${leftIcon ? 'pl-10' : 'pl-3'}
            ${(rightIcon || (isPassword && showPasswordToggle)) ? 'pr-10' : 'pr-3'}
            py-2.5
            ${hasError 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        
        {(rightIcon || (isPassword && showPasswordToggle)) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isPassword && showPasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            ) : rightIcon ? (
              <div className="text-gray-400">
                {rightIcon}
              </div>
            ) : null}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="flex items-start space-x-1">
          {error && (
            <>
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </>
          )}
          {!error && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
