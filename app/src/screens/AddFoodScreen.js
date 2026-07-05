import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, USER_ID } from '../services/api';
import { AppContext } from '../context/AppContext';
import { COLORS } from '../theme/colors';
import { TYPOGRAPHY as typo } from '../theme/typography';

export default function AddFoodScreen({ navigation }) {
  const { refreshData } = useContext(AppContext);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Mode: 'search' | 'autofill' | 'autolearn'
  const [mode, setMode] = useState('search');
  
  // Selected food (for autofill)
  const [selectedFood, setSelectedFood] = useState(null);
  
  // Form inputs
  const [customName, setCustomName] = useState('');
  const [grams, setGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/users/${USER_ID}/food-items?search=${searchQuery}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    setMode('autofill');
    setGrams('');
  };

  const handleCustomEntry = () => {
    setCustomName(searchQuery);
    setMode('autolearn');
    setGrams('');
    setCalories('');
    setProtein('');
  };

  const submitLog = async () => {
    if (!grams || isNaN(grams)) return alert('Please enter valid grams');
    
    setIsSubmitting(true);
    try {
      let payload;
      
      if (mode === 'autofill') {
        payload = {
          food_item_id: selectedFood.id,
          quantity_grams: parseFloat(grams)
        };
      } else {
        if (!customName || !calories) return alert('Name and Calories are required');
        payload = {
          name: customName,
          quantity_grams: parseFloat(grams),
          calories: parseFloat(calories),
          protein_grams: protein ? parseFloat(protein) : 0
        };
      }
      
      await api.post(`/users/${USER_ID}/food-logs`, payload);
      
      // Refresh global context to update rings
      await refreshData();
      
      // Go back to Dashboard
      navigation.goBack();
      
    } catch (err) {
      console.error(err);
      alert('Failed to log food');
      setIsSubmitting(false);
    }
  };

  const renderSearchMode = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>
      
      {isSearching && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
      
      <FlatList
        data={searchResults}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.foodItem} onPress={() => handleSelectFood(item)}>
            <Text style={typo.body}>{item.name}</Text>
            <Text style={typo.small}>{Math.round(item.calories_per_100g)} kcal / 100g</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          searchQuery.length > 1 && !isSearching ? (
            <TouchableOpacity style={styles.customEntryBtn} onPress={handleCustomEntry}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.secondary} />
              <Text style={[typo.body, { color: COLORS.secondary, marginLeft: 10 }]}>
                Create custom food: "{searchQuery}"
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </>
  );

  const renderAutofillMode = () => (
    <View style={styles.formContainer}>
      <Text style={typo.h2}>{selectedFood.name}</Text>
      <Text style={[typo.small, { marginBottom: 30 }]}>
        {Math.round(selectedFood.calories_per_100g)} kcal / 100g
      </Text>
      
      <Text style={typo.body}>Quantity (grams)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={grams}
        onChangeText={setGrams}
        placeholder="e.g. 150"
        placeholderTextColor={COLORS.textMuted}
        autoFocus
      />
      
      <TouchableOpacity style={styles.submitBtn} onPress={submitLog} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={typo.button}>Log Food</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('search')}>
        <Text style={[typo.body, { color: COLORS.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAutolearnMode = () => (
    <View style={styles.formContainer}>
      <Text style={typo.h2}>New Custom Food</Text>
      <Text style={[typo.small, { marginBottom: 20 }]}>
        Enter the total macros for the portion you ate. We'll automatically calculate and save the per-100g values for next time!
      </Text>
      
      <Text style={typo.body}>Name</Text>
      <TextInput style={styles.input} value={customName} onChangeText={setCustomName} />
      
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={typo.body}>Quantity (g)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={grams} onChangeText={setGrams} placeholder="e.g. 200" placeholderTextColor={COLORS.textMuted}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typo.body}>Total kcal</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={calories} onChangeText={setCalories} placeholder="e.g. 300" placeholderTextColor={COLORS.textMuted}/>
        </View>
      </View>
      
      <Text style={typo.body}>Total Protein (g) - Optional</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={protein} onChangeText={setProtein} placeholder="e.g. 25" placeholderTextColor={COLORS.textMuted}/>
      
      <TouchableOpacity style={styles.submitBtn} onPress={submitLog} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={typo.button}>Log & Teach</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('search')}>
        <Text style={[typo.body, { color: COLORS.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {mode === 'search' && renderSearchMode()}
      {mode === 'autofill' && renderAutofillMode()}
      {mode === 'autolearn' && renderAutolearnMode()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 10,
  },
  foodItem: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginTop: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
  },
  formContainer: {
    flex: 1,
    paddingTop: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 15,
    marginTop: 10,
  }
});
