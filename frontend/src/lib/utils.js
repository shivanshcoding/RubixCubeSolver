import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes + tailwind-merge for deduplication.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
