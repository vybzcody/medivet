import clsx from 'clsx';

/**
 * Utility function to combine class names
 * Uses clsx for conditional classes and merges them
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return clsx(classes);
}

export default cn;
