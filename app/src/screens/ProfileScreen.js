import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { api, USER_ID } from '../services/api';
import { AppContext } from '../context/AppContext';
import { COLORS } from '../theme/colors';
import { TYPOGRAPHY as typo } from '../theme/typography';

export default function ProfileScreen() {
  const { user, currentGoal, refreshData } = useContext(AppContext);
  
  const [calGoal, setCalGoal] = useState(currentGoal?.target_calories?.toString() || '');
  const [proGoal, setProGoal] = useState(currentGoal?.target_protein_grams?.toString() || '');
  
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  const saveGoals = async () => {
    if (!calGoal || !proGoal) return alert('Goals cannot be empty');
    setIsSaving(true);
    try {
      await api.post(`/users/${USER_ID}/goals`, {
        target_calories: parseFloat(calGoal),
        target_protein_grams: parseFloat(proGoal)
      });
      await refreshData();
      alert('Goals updated!');
    } catch (err) {
      alert('Failed to save goals');
    } finally {
      setIsSaving(false);
    }
  };

  const logBodyMetrics = async () => {
    if (!weight || !height) return alert('Please enter weight and height');
    setIsSaving(true);
    try {
      await api.post(`/users/${USER_ID}/body-metrics`, {
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height)
      });
      setWeight('');
      setHeight('');
      alert('Metrics logged!');
    } catch (err) {
      alert('Failed to log metrics');
    } finally {
      setIsSaving(false);
    }
  };

  const runTestSuite = async () => {
    setIsSaving(true);
    try {
      // 1. Log a new custom food (auto-learn)
      const log1Res = await api.post(`/users/${USER_ID}/food-logs`, {
        name: 'UI Test Apple',
        quantity_grams: 150,
        calories: 78,
        protein_grams: 0.5
      });
      alert('1. Logged Food:\n' + JSON.stringify(log1Res.data, null, 2));

      // 2. Fetch today's logs to verify
      const today = new Date().toISOString().split('T')[0];
      const logsRes = await api.get(`/users/${USER_ID}/food-logs?start_date=${today}T00:00:00&end_date=${today}T23:59:59`);
      alert('2. Fetched Logs:\n' + JSON.stringify(logsRes.data, null, 2));

      // 3. Delete the food log we just created
      await api.delete(`/users/${USER_ID}/food-logs/${log1Res.data.id}`);
      alert('3. Deleted log ID: ' + log1Res.data.id);

      // 4. Log body weight
      await api.post(`/users/${USER_ID}/body-metrics`, {
        weight_kg: 70,
        height_cm: 180
      });
      
      // Refresh global context
      await refreshData();
      alert('4. Test suite completed successfully!');
    } catch (err) {
      console.error(err);
      alert('Test suite failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={typo.h1}>Profile</Text>
      <Text style={[typo.bodyMuted, { marginBottom: 30 }]}>Hi, {user?.name || 'User'}</Text>

      <View style={styles.card}>
        <Text style={typo.h2}>Daily Targets</Text>
        
        <Text style={[typo.body, { marginTop: 15 }]}>Calories</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          value={calGoal} 
          onChangeText={setCalGoal} 
        />
        
        <Text style={typo.body}>Protein (g)</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          value={proGoal} 
          onChangeText={setProGoal} 
        />
        
        <TouchableOpacity style={styles.btn} onPress={saveGoals} disabled={isSaving}>
          <Text style={typo.button}>Save Targets</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={typo.h2}>Log Weight</Text>
        
        <Text style={[typo.body, { marginTop: 15 }]}>Weight (kg)</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          value={weight} 
          onChangeText={setWeight} 
          placeholder="e.g. 75"
          placeholderTextColor={COLORS.textMuted}
        />
        
        <Text style={typo.body}>Height (cm)</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          value={height} 
          onChangeText={setHeight} 
          placeholder="e.g. 180"
          placeholderTextColor={COLORS.textMuted}
        />
        
        <TouchableOpacity style={styles.btnSecondary} onPress={logBodyMetrics} disabled={isSaving}>
          <Text style={[typo.button, { color: COLORS.secondary }]}>Log Metrics</Text>
        </TouchableOpacity>
      </View>

      {/* Hidden Test Suite Button */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <TouchableOpacity style={styles.testBtn} onPress={runTestSuite} disabled={isSaving}>
          <Text style={[typo.button, { color: '#FF3B30' }]}>Run UI Test Suite (Debug)</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 15,
  },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondary: {
    backgroundColor: 'rgba(57, 255, 20, 0.1)', // Tint of secondary color
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  testBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  }
});
