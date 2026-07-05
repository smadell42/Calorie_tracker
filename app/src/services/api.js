import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically determine the API URL.
// If running on a physical device via Expo Go, it uses the packager's IP address automatically!
// This means you don't have to hardcode your PC's IP address.
const getApiBaseUrl = () => {
  // If running locally in development (Expo Go), use the local packager IP.
  // Otherwise, if this is a built production app, point to the live Render backend!
  if (__DEV__) {
    if (Platform.OS === 'web') return 'http://localhost:8000/api';
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ipAddress = hostUri.split(':')[0];
      return `http://${ipAddress}:8000/api`;
    }
    return 'http://10.0.2.2:8000/api';
  }
  
  // PRODUCTION URL
  return 'https://calorie-tracker-api-7ym2.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// For testing purposes, hardcoding user ID to 1 (Adell) as planned
export const USER_ID = 1;
