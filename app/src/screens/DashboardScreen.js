import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../context/AppContext';
import { api, USER_ID } from '../services/api';
import CircularProgress from '../components/CircularProgress';
import FAB from '../components/FAB';
import { COLORS } from '../theme/colors';
import { TYPOGRAPHY as typo } from '../theme/typography';

export default function DashboardScreen({ navigation }) {
  const { dailySummary, currentGoal, todayLogs, isLoading, error, selectedDate, changeDate, refreshData } = useContext(AppContext);

  // Edit Modal State
  const [editLog, setEditLog] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading && !todayLogs.length) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[typo.body, { color: COLORS.error, textAlign: 'center', padding: 20 }]}>{error}</Text>
      </View>
    );
  }

  const calConsumed = dailySummary?.total_calories || 0;
  const calGoal = currentGoal?.target_calories || 2000;
  const calProgress = calConsumed / calGoal;

  const proConsumed = dailySummary?.total_protein_grams || 0;
  const proGoal = currentGoal?.target_protein_grams || 100;
  const proProgress = proConsumed / proGoal;

  // Date Navigation logic
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    changeDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    changeDate(d.toISOString().split('T')[0]);
  };

  const handleUpdateLog = async () => {
    const qty = parseFloat(editQuantity);
    if (!qty || qty <= 0) return alert('Invalid quantity');
    
    setIsSaving(true);
    try {
      await api.put(`/users/${USER_ID}/food-logs/${editLog.id}`, { quantity_grams: qty });
      setEditLog(null);
      await refreshData();
    } catch (err) {
      alert('Failed to update log');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = () => {
    Alert.alert('Delete Log', 'Are you sure you want to delete this food log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setIsSaving(true);
        try {
          await api.delete(`/users/${USER_ID}/food-logs/${editLog.id}`);
          setEditLog(null);
          await refreshData();
        } catch (err) {
          alert('Failed to delete log');
        } finally {
          setIsSaving(false);
        }
      }}
    ]);
  };

  const openEditModal = (log) => {
    setEditLog(log);
    setEditQuantity(log.quantity_grams.toString());
  };

  // Check if selectedDate is today
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const dateDisplay = isToday ? 'Today' : selectedDate;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={handlePrevDay} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={typo.h1}>{dateDisplay}</Text>
        <TouchableOpacity onPress={handleNextDay} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.ringsContainer}>
        <CircularProgress 
          progress={calProgress} 
          value={Math.round(calConsumed)} 
          label={`/ ${calGoal} kcal`} 
          color={COLORS.primary} 
        />
        <CircularProgress 
          progress={proProgress} 
          value={`${Math.round(proConsumed)}g`} 
          label={`/ ${proGoal}g pro`} 
          color={COLORS.secondary} 
          size={100}
        />
      </View>
      <Text style={[typo.h3, { marginTop: 30, marginBottom: 10 }]}>Logged Foods</Text>
    </View>
  );

  const renderLogItem = ({ item }) => (
    <TouchableOpacity style={styles.logCard} onPress={() => openEditModal(item)}>
      <View>
        <Text style={typo.body}>{item.food_item_name || 'Unknown Food'}</Text>
        <Text style={typo.small}>{item.quantity_grams}g</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[typo.body, { color: COLORS.primary, fontWeight: 'bold' }]}>{Math.round(item.calories)} kcal</Text>
        <Text style={typo.small}>{Math.round(item.protein_grams || 0)}g protein</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading && todayLogs.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
      
      <FlatList
        data={todayLogs} 
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLogItem}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={typo.bodyMuted}>No food logged on this date.</Text>
          </View>
        }
      />
      
      <FAB onPress={() => navigation.navigate('AddFood')} />

      {/* Edit Modal */}
      <Modal visible={!!editLog} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={typo.h2}>Edit Log</Text>
            <Text style={[typo.bodyMuted, { marginBottom: 20 }]}>{editLog?.food_item_name}</Text>
            
            <Text style={typo.body}>Quantity (grams)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editQuantity}
              onChangeText={setEditQuantity}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flex: 1, marginRight: 5 }]} 
                onPress={() => setEditLog(null)}
              >
                <Text style={typo.button}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: COLORS.primary, flex: 1, marginLeft: 5 }]} 
                onPress={handleUpdateLog}
                disabled={isSaving}
              >
                <Text style={[typo.button, { color: '#000' }]}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 1, borderColor: '#FF3B30', marginTop: 15 }]} 
              onPress={handleDeleteLog}
              disabled={isSaving}
            >
              <Text style={[typo.button, { color: '#FF3B30' }]}>Delete Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60, // Space for status bar
    paddingBottom: 100, // Space for FAB
  },
  header: {
    marginBottom: 10,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateArrow: {
    padding: 10,
  },
  ringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
