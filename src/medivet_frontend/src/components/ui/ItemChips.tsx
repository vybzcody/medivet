import React from 'react';
import { X } from 'lucide-react';

interface ItemChipsProps {
  items: string[];
  onRemove: (index: number) => void;
  label?: string;
  className?: string;
}

const ItemChips: React.FC<ItemChipsProps> = ({ 
  items, 
  onRemove, 
  label,
  className = "" 
}) => {
  if (items.length === 0) return null;

  return (
    <div className={`mt-2 ${className}`}>
      {label && (
        <p className="text-sm text-gray-600 mb-2">{label}:</p>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span 
            key={index} 
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-blue-200"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${item}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default ItemChips;
