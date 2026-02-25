// DocumentLibraryScreen.js - Offline Document Library
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import documentService from './documentService';

export default function DocumentLibraryScreen() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courses, setCourses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadSyncStatus();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, documents, selectedCourse]);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getAllDocuments();
      setDocuments(docs);
      
      const uniqueCourses = [...new Set(docs.map(d => d.courseCode))];
      setCourses(uniqueCourses);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSyncStatus = async () => {
    const status = await documentService.getSyncStatus();
    setSyncStatus(status);
  };

  const filterDocuments = () => {
    let filtered = documents;
    
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(d => d.courseCode === selectedCourse);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.courseCode.toLowerCase().includes(query)
      );
    }
    
    setFilteredDocs(filtered);
  };

  const openDocument = async (doc) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(doc.localUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. Please download again.');
        return;
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(doc.localUri);
      } else {
        Alert.alert('Error', 'Cannot open document');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open document');
    }
  };

  const deleteDocument = (doc) => {
    Alert.alert(
      'Delete Document',
      `Remove "${doc.title}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentService.deleteDocument(doc.id, doc.localUri);
              loadDocuments();
              loadSyncStatus();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const startSync = async () => {
    setLoading(true);
    await documentService.processSyncQueue();
    await loadDocuments();
    await loadSyncStatus();
    setLoading(false);
  };

  const addSampleDocument = () => {
    documentService.queueDocument('CSC201', {
      id: 'sample-' + Date.now(),
      title: 'Introduction to Programming - Lecture Notes',
      remoteUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      tags: 'lecture,programming'
    });
    
    Alert.alert('Queued', 'Document will download when WiFi is available');
    loadSyncStatus();
  };

  const renderDocument = ({ item }) => (
    <TouchableOpacity 
      style={styles.documentCard}
      onPress={() => openDocument(item)}
      onLongPress={() => deleteDocument(item)}
    >
      <View style={styles.docIcon}>
        <Text style={styles.docIconText}>📄</Text>
      </View>
      
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <View style={styles.docMeta}>
          <Text style={styles.courseBadge}>{item.courseCode}</Text>
          <Text style={styles.docSize}>
            {documentService.formatBytes(item.fileSize || 0)}
          </Text>
        </View>
        
        <Text style={styles.docDate}>
          Downloaded: {new Date(item.downloadedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && documents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {syncStatus?.isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#27ae60" />
              <Text style={styles.statusText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.statusDot}>●</Text>
              <Text style={styles.statusText}>
                {syncStatus?.pending || 0} pending, {syncStatus?.totalDocuments || 0} docs
              </Text>
            </>
          )}
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={startSync}
          >
            <Text style={styles.headerButtonText}>🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={addSampleDocument}
          >
            <Text style={styles.headerButtonText}>➕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedCourse === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedCourse('all')}
        >
          <Text style={[styles.filterText, selectedCourse === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        {courses.map(course => (
          <TouchableOpacity
            key={course}
            style={[styles.filterChip, selectedCourse === course && styles.filterChipActive]}
            onPress={() => setSelectedCourse(course)}
          >
            <Text style={[styles.filterText, selectedCourse === course && styles.filterTextActive]}>
              {course}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredDocs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No documents</Text>
          <Text style={styles.emptySubtext}>
            Documents will appear here when downloaded
          </Text>
          
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={addSampleDocument}
          >
            <Text style={styles.syncButtonText}>Add Sample Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderDocument}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDocuments();
            loadSyncStatus();
          }}
        />
      )}

      {syncStatus && documents.length > 0 && (
        <View style={styles.storageFooter}>
          <Text style={styles.storageText}>
            📦 {syncStatus.storageUsed} used • {syncStatus.totalDocuments} files
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    color: '#27ae60',
    fontSize: 16,
    marginRight: 5,
  },
  statusText: {
    color: '#2c3e50',
    fontSize: 14,
    marginLeft: 5,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerButtonText: {
    fontSize: 20,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: 'white',
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#3498db',
  },
  filterText: {
    color: '#2c3e50',
    fontSize: 14,
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  docIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  docIconText: {
    fontSize: 24,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 5,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  courseBadge: {
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#0288d1',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 10,
  },
  docSize: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  docDate: {
    color: '#95a5a6',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 20,
  },
  syncButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  storageFooter: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    alignItems: 'center',
  },
  storageText: {
    color: '#7f8c8d',
    fontSize: 12,
  },
});
