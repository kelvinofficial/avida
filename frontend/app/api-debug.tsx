/**
 * API Debug Screen - Shows current API configuration
 * Access via /api-debug in the app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { API_URL, PRODUCTION_API_URL, getApiUrl } from '../src/utils/api';

export default function ApiDebugScreen() {
  const router = useRouter();
  const [testResult, setTestResult] = useState<string>('Not tested');
  const [testing, setTesting] = useState(false);

  const testApiConnection = async () => {
    setTesting(true);
    setTestResult('Testing...');
    
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ SUCCESS! Got ${data.length || 0} categories`);
      } else {
        setTestResult(`❌ HTTP Error: ${response.status}`);
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Get all config sources
  const expoConfigApiUrl = Constants.expoConfig?.extra?.apiUrl || 'undefined';
  const expoConfigBackendUrl = Constants.expoConfig?.extra?.backendUrl || 'undefined';
  const manifestApiUrl = (Constants.manifest as any)?.extra?.apiUrl || 'undefined';
  const envVar = process.env.EXPO_PUBLIC_BACKEND_URL || 'undefined';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Debug</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current API URL</Text>
          <Text style={styles.value}>{API_URL}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hardcoded Production URL</Text>
          <Text style={styles.value}>{PRODUCTION_API_URL}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Config Sources</Text>
          
          <Text style={styles.label}>expoConfig.extra.apiUrl:</Text>
          <Text style={styles.value}>{expoConfigApiUrl}</Text>
          
          <Text style={styles.label}>expoConfig.extra.backendUrl:</Text>
          <Text style={styles.value}>{expoConfigBackendUrl}</Text>
          
          <Text style={styles.label}>manifest.extra.apiUrl:</Text>
          <Text style={styles.value}>{manifestApiUrl}</Text>
          
          <Text style={styles.label}>process.env.EXPO_PUBLIC_BACKEND_URL:</Text>
          <Text style={styles.value}>{envVar}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Test</Text>
          <Text style={styles.testResult}>{testResult}</Text>
          
          <TouchableOpacity 
            style={[styles.testButton, testing && styles.testButtonDisabled]}
            onPress={testApiConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.testButtonText}>Test API Connection</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expo Constants</Text>
          <Text style={styles.value}>
            {JSON.stringify({
              expoConfig: Constants.expoConfig ? 'defined' : 'undefined',
              manifest: Constants.manifest ? 'defined' : 'undefined',
              appOwnership: Constants.appOwnership,
              executionEnvironment: Constants.executionEnvironment,
            }, null, 2)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  testResult: {
    fontSize: 14,
    color: '#333',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
