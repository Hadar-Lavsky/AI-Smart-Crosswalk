import { clsx } from 'clsx';

export * from './formatters';

// Merges Tailwind class names, ignoring falsy values.
export const cn = (...inputs) => clsx(inputs);
