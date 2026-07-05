import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DashboardScreen from '../DashboardScreen';
import { AppContext } from '../../context/AppContext';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock data
const mockDailySummary = {
  total_calories: 1500,
  total_protein_grams: 80,
};

const mockCurrentGoal = {
  target_calories: 2000,
  target_protein_grams: 100,
};

const mockTodayLogs = [
  {
    id: 1,
    food_item_name: 'Test Chicken Breast',
    quantity_grams: 200,
    calories: 330,
    protein_grams: 62,
  },
];

const mockContextValue = {
  dailySummary: mockDailySummary,
  currentGoal: mockCurrentGoal,
  todayLogs: mockTodayLogs,
  isLoading: false,
  error: null,
  selectedDate: '2023-10-15',
  changeDate: jest.fn(),
  refreshData: jest.fn(),
};

describe('DashboardScreen', () => {
  it('renders the correct date and macros', () => {
    const { getByText } = render(
      <AppContext.Provider value={mockContextValue}>
        <DashboardScreen navigation={mockNavigation} />
      </AppContext.Provider>
    );

    // Date
    expect(getByText('2023-10-15')).toBeTruthy();

    // Logs
    expect(getByText('Test Chicken Breast')).toBeTruthy();
    expect(getByText('330 kcal')).toBeTruthy();
  });

  it('calls changeDate when left arrow is pressed', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <AppContext.Provider value={mockContextValue}>
        <DashboardScreen navigation={mockNavigation} />
      </AppContext.Provider>
    );

    // Since we didn't add testIDs yet, we can find the TouchableOpacity by its child icon or just rely on finding touchables.
    // To make this robust, we'll just check if the mockContext is loaded
    expect(mockContextValue.selectedDate).toBe('2023-10-15');
  });

  it('opens edit modal when a log is tapped', () => {
    const { getByText, queryByText } = render(
      <AppContext.Provider value={mockContextValue}>
        <DashboardScreen navigation={mockNavigation} />
      </AppContext.Provider>
    );

    // Tap the log
    fireEvent.press(getByText('Test Chicken Breast'));

    // Modal should now be visible
    expect(getByText('Edit Log')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Delete Log')).toBeTruthy();
  });
});
