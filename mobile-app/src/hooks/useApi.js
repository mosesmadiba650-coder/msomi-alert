// hooks/useApi.js
import { useState, useCallback } from 'react';
import apiService from '../services/api.service';

export const useApi = (apiMethod) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService[apiMethod](params);
      setData(result);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Request failed';
      setError(errorMessage);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [apiMethod]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
};
