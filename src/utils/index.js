// src/utils/index.js
// Main utilities export file for COSMOS

import ocrUtils from './ocr';
import visionUtils from './vision';
import systemUtils from './system';

/**
 * Combines all utility modules into a single export
 */
export default {
  // OCR utilities
  ocr: ocrUtils,
  
  // Computer vision utilities
  vision: visionUtils,
  
  // System interaction utilities
  system: systemUtils,
  
  // Convenience methods from each module
  detectElements: visionUtils.detectElements,
  recognizeText: ocrUtils.recognizeText,
  getSystemInfo: systemUtils.getSystemInfo,
  sendNotification: systemUtils.sendNotification,
  
  // Shorthand methods for common operations
  async captureAndAnalyze(options = {}) {
    const screenshot = await systemUtils.captureScreen(options.savePath);
    const elements = await visionUtils.detectElements(screenshot, options.visionOptions || {});
    const textElements = await ocrUtils.extractTextElements(screenshot, options.ocrOptions || {});
    
    return {
      screenshot,
      elements,
      textElements
    };
  },
  
  // User-friendly waiting utility
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Error handling for automation operations
  handleError(error, context = {}) {
    console.error(`Automation error: ${error.message}`, {
      context,
      stack: error.stack
    });
    
    // Send notification if enabled
    if (context.notifyOnError !== false) {
      systemUtils.sendNotification({
        title: 'COSMOS Automation Error',
        message: error.message,
        type: 'error'
      }).catch(() => {});
    }
    
    return {
      success: false,
      error: error.message,
      context
    };
  }
};
