import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme/colors';

import { AppProvider } from './src/context/AppContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <SafeAreaProvider style={{ backgroundColor: COLORS.background }}>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
