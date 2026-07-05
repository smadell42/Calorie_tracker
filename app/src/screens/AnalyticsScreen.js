import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { api, USER_ID } from '../services/api';
import { COLORS } from '../theme/colors';
import { TYPOGRAPHY as typo } from '../theme/typography';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [weeklyData, setWeeklyData] = useState(null);
  const [weightData, setWeightData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const weeklyRes = await api.get(`/users/${USER_ID}/analytics/weekly`);
      setWeeklyData(weeklyRes.data);

      const weightRes = await api.get(`/users/${USER_ID}/analytics/weight-trend`);
      setWeightData(weightRes.data.data_points || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: COLORS.secondary
    }
  };

  // Format weekly data for BarChart
  const weekLabels = weeklyData?.daily_breakdown?.map(d => {
    const date = new Date(d.date);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  }) || [];
  
  const weekCalories = weeklyData?.daily_breakdown?.map(d => d.total_calories) || [];

  // Format weight data for LineChart
  const weightLabels = weightData.map(d => {
    const date = new Date(d.recorded_at);
    return `${date.getMonth()+1}/${date.getDate()}`;
  }).slice(-7); // only show last 7 entries for neatness

  const weightValues = weightData.map(d => d.weight_kg).slice(-7);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={typo.h1}>Analytics</Text>
      
      <View style={styles.card}>
        <Text style={typo.h3}>7-Day Calories</Text>
        <Text style={[typo.small, { marginBottom: 15 }]}>Avg: {Math.round(weeklyData?.average_calories || 0)} kcal/day</Text>
        
        {weekCalories.length > 0 ? (
          <BarChart
            data={{
              labels: weekLabels,
              datasets: [{ data: weekCalories }]
            }}
            width={screenWidth - 60}
            height={220}
            yAxisSuffix="k"
            yAxisInterval={1}
            chartConfig={chartConfig}
            style={styles.chartStyle}
            withInnerLines={false}
            showValuesOnTopOfBars
          />
        ) : (
          <Text style={typo.bodyMuted}>No data available</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={typo.h3}>Weight Trend</Text>
        
        {weightValues.length > 1 ? (
          <LineChart
            data={{
              labels: weightLabels,
              datasets: [{ 
                data: weightValues,
                color: (opacity = 1) => `rgba(57, 255, 20, ${opacity})`, // Secondary color (Neon Green)
              }]
            }}
            width={screenWidth - 60}
            height={220}
            yAxisSuffix="kg"
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        ) : (
          <Text style={typo.bodyMuted}>Log your weight at least twice to see the trend.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  }
});
