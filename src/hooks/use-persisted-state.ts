import { useCallback, useEffect, useRef, useState } from 'react';

function parseStoredBoolean(value: string | null): boolean | null {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
}

/**
 * Persist a boolean preference in localStorage with SSR-safe fallbacks.
 *
 * If no stored value exists, the hook follows `defaultValue`. Once the user
 * sets the value manually, future `defaultValue` updates no longer override it.
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue: boolean,
): readonly [boolean, (next: boolean | ((prev: boolean) => boolean)) => void, boolean] {
  const [value, setValue] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasStoredValueRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = parseStoredBoolean(window.localStorage.getItem(key));
      if (parsed === null) {
        hasStoredValueRef.current = false;
        setValue(defaultValue);
      } else {
        hasStoredValueRef.current = true;
        setValue(parsed);
      }
    } catch {
      hasStoredValueRef.current = false;
      setValue(defaultValue);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!isHydrated || hasStoredValueRef.current) {
      return;
    }
    setValue(defaultValue);
  }, [defaultValue, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return;
    }
    let parsedStoredValue: boolean | null = null;
    try {
      parsedStoredValue = parseStoredBoolean(window.localStorage.getItem(key));
    } catch {
      parsedStoredValue = null;
    }
    if (parsedStoredValue === value) {
      return;
    }
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // localStorage can throw in restricted environments; keep in-memory value.
    }
  }, [isHydrated, key, value]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== key) {
        return;
      }
      const parsed = parseStoredBoolean(event.newValue);
      if (parsed === null) {
        hasStoredValueRef.current = false;
        setValue(defaultValue);
        return;
      }
      hasStoredValueRef.current = true;
      setValue(parsed);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [defaultValue, key]);

  const setPersistedValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      hasStoredValueRef.current = true;
      setValue((prev) => (typeof next === 'function' ? next(prev) : next));
    },
    [],
  );

  return [value, setPersistedValue, isHydrated] as const;
}
