/**
 * useOptimisticUpdate Hook
 * 
 * A hook for implementing optimistic UI updates in the admin dashboard.
 * Updates the UI instantly before the API call completes, then syncs in the background.
 * Automatically rolls back on failure.
 * 
 * @example
 * const { execute, isPending } = useOptimisticUpdate<Settings>({
 *   onOptimisticUpdate: (prev, newData) => ({ ...prev, ...newData }),
 *   onSuccess: (result) => console.log('Saved:', result),
 *   onError: (error) => console.error('Failed:', error),
 * });
 * 
 * // Usage:
 * execute({
 *   apiCall: () => api.updateSettings(newSettings),
 *   optimisticData: newSettings,
 *   setState: setSettings,
 *   currentState: settings,
 * });
 */

import { useState, useCallback, useRef } from 'react';

interface OptimisticUpdateConfig<T> {
  /** Called when the API call succeeds */
  onSuccess?: (result: T) => void;
  /** Called when the API call fails */
  onError?: (error: Error, rollbackData: T) => void;
  /** Custom function to merge optimistic data */
  onOptimisticUpdate?: (current: T, optimisticData: Partial<T>) => T;
  /** Delay before showing success message (for visual feedback) */
  successDelay?: number;
}

interface ExecuteParams<T> {
  /** The async API call to execute */
  apiCall: () => Promise<T>;
  /** The optimistic data to apply immediately */
  optimisticData: Partial<T>;
  /** The setState function to update */
  setState: React.Dispatch<React.SetStateAction<T>>;
  /** Current state value (for rollback) */
  currentState: T;
  /** Optional custom merge function for this specific call */
  mergeFn?: (current: T, optimistic: Partial<T>) => T;
}

interface OptimisticUpdateReturn<T> {
  /** Execute an optimistic update */
  execute: (params: ExecuteParams<T>) => Promise<boolean>;
  /** Whether an update is currently pending */
  isPending: boolean;
  /** Any error from the last update */
  error: Error | null;
  /** Clear the error state */
  clearError: () => void;
}

export function useOptimisticUpdate<T = unknown>(
  config: OptimisticUpdateConfig<T> = {}
): OptimisticUpdateReturn<T> {
  const { onSuccess, onError, onOptimisticUpdate, successDelay = 0 } = config;
  
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const rollbackRef = useRef<T | null>(null);

  const execute = useCallback(
    async ({ apiCall, optimisticData, setState, currentState, mergeFn }: ExecuteParams<T>): Promise<boolean> => {
      // Store current state for potential rollback
      rollbackRef.current = currentState;
      setError(null);
      setIsPending(true);

      // Apply optimistic update immediately
      const mergeFunction = mergeFn || onOptimisticUpdate || ((current: T, data: Partial<T>) => ({ ...current, ...data }));
      const optimisticState = mergeFunction(currentState, optimisticData);
      setState(optimisticState);

      try {
        // Execute the actual API call in the background
        const result = await apiCall();

        // Optional delay for visual feedback
        if (successDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, successDelay));
        }

        // Update with actual server response if needed
        if (result && typeof result === 'object') {
          setState(result);
        }

        onSuccess?.(result);
        setIsPending(false);
        rollbackRef.current = null;
        return true;
      } catch (err) {
        // Rollback to previous state
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsPending(false);

        if (rollbackRef.current !== null) {
          setState(rollbackRef.current);
          onError?.(errorObj, rollbackRef.current);
        }

        rollbackRef.current = null;
        return false;
      }
    },
    [onSuccess, onError, onOptimisticUpdate, successDelay]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isPending,
    error,
    clearError,
  };
}

/**
 * useOptimisticList Hook
 * 
 * Specialized hook for optimistic updates on lists/arrays.
 * Supports add, update, and delete operations with instant UI feedback.
 */
interface ListItem {
  id: string;
  [key: string]: unknown;
}

interface OptimisticListConfig<T extends ListItem> {
  onSuccess?: (operation: 'add' | 'update' | 'delete', item: T | T[]) => void;
  onError?: (error: Error, operation: 'add' | 'update' | 'delete') => void;
}

interface OptimisticListReturn<T extends ListItem> {
  /** Optimistically add an item */
  optimisticAdd: (params: {
    apiCall: () => Promise<T>;
    tempItem: T;
    setList: React.Dispatch<React.SetStateAction<T[]>>;
    currentList: T[];
  }) => Promise<boolean>;
  
  /** Optimistically update an item */
  optimisticUpdate: (params: {
    apiCall: () => Promise<T>;
    itemId: string;
    updates: Partial<T>;
    setList: React.Dispatch<React.SetStateAction<T[]>>;
    currentList: T[];
  }) => Promise<boolean>;
  
  /** Optimistically delete an item */
  optimisticDelete: (params: {
    apiCall: () => Promise<void>;
    itemId: string;
    setList: React.Dispatch<React.SetStateAction<T[]>>;
    currentList: T[];
  }) => Promise<boolean>;
  
  isPending: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useOptimisticList<T extends ListItem>(
  config: OptimisticListConfig<T> = {}
): OptimisticListReturn<T> {
  const { onSuccess, onError } = config;
  
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const optimisticAdd = useCallback(
    async ({ apiCall, tempItem, setList, currentList }: {
      apiCall: () => Promise<T>;
      tempItem: T;
      setList: React.Dispatch<React.SetStateAction<T[]>>;
      currentList: T[];
    }) => {
      setIsPending(true);
      setError(null);
      
      // Optimistically add item with temp ID
      setList([tempItem, ...currentList]);
      
      try {
        const result = await apiCall();
        // Replace temp item with actual item from server
        setList(prev => prev.map(item => 
          item.id === tempItem.id ? result : item
        ));
        onSuccess?.('add', result);
        setIsPending(false);
        return true;
      } catch (err) {
        // Rollback: remove the temp item
        setList(currentList);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        onError?.(errorObj, 'add');
        setIsPending(false);
        return false;
      }
    },
    [onSuccess, onError]
  );

  const optimisticUpdate = useCallback(
    async ({ apiCall, itemId, updates, setList, currentList }: {
      apiCall: () => Promise<T>;
      itemId: string;
      updates: Partial<T>;
      setList: React.Dispatch<React.SetStateAction<T[]>>;
      currentList: T[];
    }) => {
      setIsPending(true);
      setError(null);
      
      // Optimistically update the item
      setList(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ));
      
      try {
        const result = await apiCall();
        // Update with server response
        setList(prev => prev.map(item =>
          item.id === itemId ? result : item
        ));
        onSuccess?.('update', result);
        setIsPending(false);
        return true;
      } catch (err) {
        // Rollback
        setList(currentList);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        onError?.(errorObj, 'update');
        setIsPending(false);
        return false;
      }
    },
    [onSuccess, onError]
  );

  const optimisticDelete = useCallback(
    async ({ apiCall, itemId, setList, currentList }: {
      apiCall: () => Promise<void>;
      itemId: string;
      setList: React.Dispatch<React.SetStateAction<T[]>>;
      currentList: T[];
    }) => {
      setIsPending(true);
      setError(null);
      
      // Optimistically remove the item
      setList(prev => prev.filter(item => item.id !== itemId));
      
      try {
        await apiCall();
        onSuccess?.('delete', currentList.find(item => item.id === itemId) as T);
        setIsPending(false);
        return true;
      } catch (err) {
        // Rollback
        setList(currentList);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        onError?.(errorObj, 'delete');
        setIsPending(false);
        return false;
      }
    },
    [onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    isPending,
    error,
    clearError,
  };
}

/**
 * useOptimisticToggle Hook
 * 
 * Specialized hook for optimistic toggle/switch operations.
 * Perfect for enable/disable toggles, checkboxes, etc.
 */
export function useOptimisticToggle<T>(config: {
  onSuccess?: (newValue: T) => void;
  onError?: (error: Error) => void;
} = {}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggle = useCallback(
    async ({
      apiCall,
      newValue,
      setValue,
      currentValue,
    }: {
      apiCall: () => Promise<T>;
      newValue: T;
      setValue: React.Dispatch<React.SetStateAction<T>>;
      currentValue: T;
    }) => {
      setIsPending(true);
      setError(null);
      
      // Optimistically set new value
      setValue(newValue);
      
      try {
        const result = await apiCall();
        setValue(result);
        config.onSuccess?.(result);
        setIsPending(false);
        return true;
      } catch (err) {
        // Rollback
        setValue(currentValue);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        config.onError?.(errorObj);
        setIsPending(false);
        return false;
      }
    },
    [config]
  );

  return { toggle, isPending, error, clearError: () => setError(null) };
}

export default useOptimisticUpdate;
