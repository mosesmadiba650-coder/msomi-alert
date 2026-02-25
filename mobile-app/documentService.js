// documentService.js - Offline Document Sync Engine
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const db = SQLite.openDatabaseSync('msomi_docs.db');

class DocumentService {
  constructor() {
    this.downloadDir = FileSystem.documentDirectory + 'course_materials/';
    this.isSyncing = false;
    this.initDatabase();
    this.ensureDirectoryExists();
  }

  initDatabase() {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          courseCode TEXT,
          title TEXT,
          fileName TEXT,
          fileSize INTEGER,
          fileType TEXT,
          localUri TEXT,
          remoteUrl TEXT,
          downloadedAt DATETIME,
          tags TEXT
        );
      `);
      console.log('📚 Document database initialized');
    } catch (error) {
      console.error('DB init error:', error);
    }
  }

  async ensureDirectoryExists() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.downloadDir, { intermediates: true });
        console.log('📁 Created document directory');
      }
    } catch (error) {
      console.error('Directory error:', error);
    }
  }

  async isWifiConnected() {
    const netInfo = await NetInfo.fetch();
    return netInfo.type === 'wifi' && netInfo.isConnected;
  }

  async queueDocument(courseCode, document) {
    const queueItem = {
      id: document.id || Date.now().toString(),
      courseCode,
      ...document,
      queuedAt: new Date().toISOString(),
      status: 'pending'
    };

    const queue = await this.getSyncQueue();
    queue.push(queueItem);
    await AsyncStorage.setItem('docSyncQueue', JSON.stringify(queue));

    if (await this.isWifiConnected()) {
      this.processSyncQueue();
    }

    return queueItem;
  }

  async getSyncQueue() {
    const queue = await AsyncStorage.getItem('docSyncQueue');
    return queue ? JSON.parse(queue) : [];
  }

  async processSyncQueue() {
    if (this.isSyncing) return;

    const isWifi = await this.isWifiConnected();
    if (!isWifi) {
      console.log('⏸️ Not on WiFi, skipping sync');
      return;
    }

    this.isSyncing = true;
    const queue = await this.getSyncQueue();
    const results = [];

    for (const item of queue) {
      if (item.status === 'pending') {
        try {
          const result = await this.downloadDocument(item);
          results.push(result);
          item.status = 'completed';
          item.completedAt = new Date().toISOString();
        } catch (error) {
          console.error('Download failed:', error);
          item.status = 'failed';
          item.error = error.message;
        }
      }
    }

    await AsyncStorage.setItem('docSyncQueue', JSON.stringify(queue));
    this.isSyncing = false;

    return results;
  }

  async downloadDocument(doc) {
    try {
      const fileName = `${doc.courseCode}_${doc.id}_${Date.now()}.pdf`;
      const localUri = this.downloadDir + fileName;

      const downloadResult = await FileSystem.downloadAsync(
        doc.remoteUrl,
        localUri
      );

      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        
        await this.saveDocumentToDB({
          id: doc.id,
          courseCode: doc.courseCode,
          title: doc.title || fileName,
          fileName: fileName,
          fileSize: fileInfo.size,
          fileType: 'pdf',
          localUri: localUri,
          remoteUrl: doc.remoteUrl,
          downloadedAt: new Date().toISOString(),
          tags: doc.tags || ''
        });

        console.log(`✅ Downloaded: ${fileName}`);
        return { success: true, localUri, fileInfo };
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      return { success: false, error: error.message };
    }
  }

  async saveDocumentToDB(doc) {
    try {
      db.runSync(
        `INSERT OR REPLACE INTO documents 
         (id, courseCode, title, fileName, fileSize, fileType, localUri, remoteUrl, downloadedAt, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [doc.id, doc.courseCode, doc.title, doc.fileName, doc.fileSize, 
         doc.fileType, doc.localUri, doc.remoteUrl, doc.downloadedAt, doc.tags]
      );
    } catch (error) {
      console.error('Save error:', error);
    }
  }

  async getAllDocuments() {
    try {
      const result = db.getAllSync('SELECT * FROM documents ORDER BY downloadedAt DESC');
      return result;
    } catch (error) {
      console.error('Get docs error:', error);
      return [];
    }
  }

  async deleteDocument(docId, localUri) {
    try {
      if (localUri) {
        await FileSystem.deleteAsync(localUri);
      }
      db.runSync('DELETE FROM documents WHERE id = ?', [docId]);
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async getSyncStatus() {
    const queue = await this.getSyncQueue();
    const pending = queue.filter(q => q.status === 'pending').length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const failed = queue.filter(q => q.status === 'failed').length;

    const docs = await this.getAllDocuments();
    let totalSize = 0;
    docs.forEach(d => totalSize += d.fileSize || 0);

    return {
      isSyncing: this.isSyncing,
      queueLength: queue.length,
      pending,
      completed,
      failed,
      totalDocuments: docs.length,
      storageUsed: this.formatBytes(totalSize),
      lastSync: await AsyncStorage.getItem('lastDocSync')
    };
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

const documentService = new DocumentService();
export default documentService;
