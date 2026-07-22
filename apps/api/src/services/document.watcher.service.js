const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const aiService = require('./ai.service');

class DocumentWatcherService {
  constructor() {
    this.watcher = null;
    this.debounceTimeout = null;
    this.targetFolder = path.resolve(__dirname, '../../../../Documents');
  }

  /**
   * Start watching the Documents directory for new or modified PDF/TXT files.
   */
  startWatching() {
    if (!fs.existsSync(this.targetFolder)) {
      logger.warn(`Document watcher directory not found: ${this.targetFolder}`);
      return;
    }

    logger.info(`🔍 Document Watcher started monitoring: ${this.targetFolder}`);

    try {
      this.watcher = fs.watch(this.targetFolder, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const ext = path.extname(filename).toLowerCase();
        if (['.pdf', '.txt', '.md'].includes(ext)) {
          logger.info(`📁 Document change detected in Documents folder: ${filename} (${eventType})`);
          
          // Debounce indexing by 2 seconds to avoid multiple triggers on file copy
          if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
          this.debounceTimeout = setTimeout(async () => {
            try {
              logger.info(`🔄 Auto-indexing updated Documents folder...`);
              const results = await aiService.indexDocumentsFolder(this.targetFolder);
              logger.info(`✅ Auto-indexing completed. ${results.length} files currently active in RAG store.`);
            } catch (err) {
              logger.error(`❌ Auto-indexing error: ${err.message}`);
            }
          }, 2000);
        }
      });
    } catch (err) {
      logger.error(`Failed to start document watcher: ${err.message}`);
    }
  }

  /**
   * Stop the directory watcher.
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('Document Watcher stopped.');
    }
  }
}

module.exports = new DocumentWatcherService();
