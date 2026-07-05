import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import AddFoodScreen from '../screens/AddFoodScreen';
import { COLORS } from '../theme/colors';

const Stack = createNativeStackNavigator();

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* The main tabs (Dashboard, Analytics, Profile) */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        
        {/* The Add Food flow pushed on top of tabs (modal style) */}
        <Stack.Screen 
          name="AddFood" 
          component={AddFoodScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: true,
            headerTitle: 'Log Food',
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
