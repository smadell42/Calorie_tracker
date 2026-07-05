import React, { createContext, useState, useEffect } from 'react';
import { api, USER_ID } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manage the currently viewed date globally so it persists across tabs
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchAppData = async (dateOverride = null) => {
    setIsLoading(true);
    setError(null);
    const targetDate = dateOverride || selectedDate;

    try {
      // Fetch user profile
      const userRes = await api.get(`/users/${USER_ID}`);
      setUser(userRes.data);

      // Fetch current goal gracefully
      try {
        const goalRes = await api.get(`/users/${USER_ID}/goals/current`);
        setCurrentGoal(goalRes.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // No goal set yet, default to 2000 kcal / 100g protein
          setCurrentGoal({ target_calories: 2000, target_protein_grams: 100 });
        } else {
          throw err;
        }
      }

      // Fetch summary for the selected date
      const summaryRes = await api.get(`/users/${USER_ID}/analytics/daily?date=${targetDate}`);
      setDailySummary(summaryRes.data);

      // Fetch logs for the selected date
      const logsRes = await api.get(`/users/${USER_ID}/food-logs?date=${targetDate}`);
      setTodayLogs(logsRes.data);

    } catch (err) {
      console.error('Error fetching app data:', err);
      setError('Failed to connect to the backend. Make sure your IP is correct in api.js and the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch whenever the selectedDate changes
  useEffect(() => {
    fetchAppData();
  }, [selectedDate]);

  const changeDate = (newDateStr) => {
    setSelectedDate(newDateStr);
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      currentGoal, 
      dailySummary, 
      todayLogs, 
      selectedDate,
      changeDate,
      isLoading, 
      error, 
      refreshData: () => fetchAppData() 
    }}>
      {children}
    </AppContext.Provider>
  );
};
