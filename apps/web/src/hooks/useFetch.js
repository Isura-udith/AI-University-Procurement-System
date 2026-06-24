import { useState, useEffect, useCallback } from 'react';

export function useFetch(fetchFn, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      setData(result?.data || result);
      return result;
    } catch (err) {
      setError(err?.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    const runFetch = async () => {
      if (immediate) await execute();
    };
    runFetch();
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}

export default useFetch;
