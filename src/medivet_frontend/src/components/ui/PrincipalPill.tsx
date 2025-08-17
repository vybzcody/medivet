import React, { useState } from 'react';
import { Copy, Check, User, Crown } from 'lucide-react';
import { cn } from '../../utils/cn';
import useUserMappingStore from '../../stores/useUserMappingStore';

interface PrincipalPillProps {
  principal: string;
  showCopy?: boolean;
  showIcon?: boolean;
  showRole?: boolean;
  variant?: 'default' | 'compact' | 'full';
  className?: string;
  onClick?: () => void;
}

const PrincipalPill: React.FC<PrincipalPillProps> = ({
  principal,
  showCopy = true,
  showIcon = true,
  showRole = false,
  variant = 'default',
  className,
  onClick
}) => {
  const [copied, setCopied] = useState(false);
  const { getDisplayName, getUserByPrincipal } = useUserMappingStore();
  
  const user = getUserByPrincipal(principal);
  const displayName = getDisplayName(principal);
  const isCurrentUser = displayName.includes('...');
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(principal);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      
      // Fallback to older method
      const textArea = document.createElement('textarea');
      textArea.value = principal;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy principal:', err);
      
      // Show user-friendly message
      alert(`Principal ID: ${principal}\n\nCopy manually from above.`);
    }
  };

  const getPillContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className="flex items-center space-x-1">
            {showIcon && (
              user?.role === 'HealthcareProvider' ? 
                <Crown className="h-3 w-3 text-blue-600" /> : 
                <User className="h-3 w-3 text-gray-500" />
            )}
            <span className="text-xs font-medium">
              {principal.slice(0, 6)}...{principal.slice(-3)}
            </span>
          </div>
        );
        
      case 'full':
        return (
          <div className="flex items-center space-x-2">
            {showIcon && (
              user?.role === 'HealthcareProvider' ? 
                <Crown className="h-4 w-4 text-blue-600" /> : 
                <User className="h-4 w-4 text-gray-500" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium">{displayName}</span>
              {showRole && user?.role && (
                <span className="text-xs text-gray-500 capitalize">{user.role}</span>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center space-x-1.5">
            {showIcon && (
              user?.role === 'HealthcareProvider' ? 
                <Crown className="h-3.5 w-3.5 text-blue-600" /> : 
                <User className="h-3.5 w-3.5 text-gray-500" />
            )}
            <span className="text-sm font-medium">
              {isCurrentUser ? displayName : displayName}
            </span>
            {showRole && user?.role && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                {user.role === 'HealthcareProvider' ? 'Provider' : 'Patient'}
              </span>
            )}
          </div>
        );
    }
  };

  const baseClasses = cn(
    "inline-flex items-center space-x-1 px-2 py-1 rounded-full border transition-all duration-200",
    variant === 'compact' && "px-1.5 py-0.5",
    variant === 'full' && "px-3 py-2",
    isCurrentUser 
      ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" 
      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
    onClick && "cursor-pointer hover:shadow-sm",
    className
  );

  return (
    <div className={baseClasses} onClick={onClick}>
      {getPillContent()}
      
      {showCopy && (
        <button
          onClick={handleCopy}
          className={cn(
            "ml-1 p-0.5 rounded hover:bg-white/50 transition-colors",
            variant === 'compact' && "ml-0.5"
          )}
          title="Copy Principal ID"
        >
          {copied ? (
            <Check className={cn(
              "text-green-600",
              variant === 'compact' ? "h-3 w-3" : "h-3.5 w-3.5"
            )} />
          ) : (
            <Copy className={cn(
              "text-gray-400 hover:text-gray-600",
              variant === 'compact' ? "h-3 w-3" : "h-3.5 w-3.5"
            )} />
          )}
        </button>
      )}
    </div>
  );
};

export default PrincipalPill;
