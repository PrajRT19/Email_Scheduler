import { useState, useCallback, useRef } from 'react';

/**
 * Returns a debounced version of the provided value.
 * Fires onChange (if provided) after the delay has elapsed without updates.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (newValue: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setDebouncedValue(newValue);
      }, delay);
    },
    [delay]
  );

  // Keep in sync when used as a simple derived hook
  if (value !== debouncedValue) {
    debounced(value);
  }

  return debouncedValue;
}

/**
 * Provides a debounced setter pattern for string inputs.
 */
export function useSearchQuery(delay = 400) {
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = useCallback(
    (value: string) => {
      setRaw(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setQuery(value.trim());
      }, delay);
    },
    [delay]
  );

  return { raw, query, onChange };
}
