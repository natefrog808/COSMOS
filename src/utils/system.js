// src/utils/system.js
// System interaction utilities for COSMOS

import os from 'os';
import fs from 'fs';
import path from 'path';
import robotjs from 'robotjs';
import activeWindow from 'active-win';
import nodeNotifier from 'node-notifier';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

/**
 * System service for interacting with the operating system
 */
class SystemService {
  /**
   * Get detailed information about the system
   * @returns {Object} - System information
   */
  static async getSystemInfo() {
    // Basic system information
    const info = {
      platform: os.platform(),
      release: os.release(),
      architecture: os.arch(),
      hostname: os.hostname(),
      uptime: {
        seconds: os.uptime(),
        formatted: this.formatUptime(os.uptime())
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        speed: os.cpus()[0].speed,
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        totalGB: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10,
        freeGB: Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10,
        usagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 1000) / 10
      },
      network: {
        interfaces: Object.keys(os.networkInterfaces())
      },
      user: {
        username: os.userInfo().username,
        homedir: os.userInfo().homedir
      }
    };
    
    // Add platform-specific information
    try {
      if (os.platform() === 'win32') {
        // Windows-specific information
        const { stdout: computerName } = await execAsync('wmic computersystem get name');
        const { stdout: osInfo } = await execAsync('wmic os get Caption');
        
        info.windows = {
          computerName: computerName.split('\n')[1].trim(),
          osVersion: osInfo.split('\n')[1].trim()
        };
      } else if (os.platform() === 'darwin') {
        // macOS-specific information
        const { stdout: macVersion } = await execAsync('sw_vers -productVersion');
        const { stdout: macName } = await execAsync('scutil --get ComputerName');
        
        info.mac = {
          version: macVersion.trim(),
          computerName: macName.trim()
        };
      } else if (os.platform() === 'linux') {
        // Linux-specific information
        try {
          const { stdout: distro } = await execAsync('lsb_release -ds');
          info.linux = {
            distribution: distro.trim()
          };
        } catch (e) {
          // lsb_release might not be available on all Linux distributions
          info.linux = {
            distribution: 'Unknown Linux distribution'
          };
        }
      }
    } catch (error) {
      // Don't let platform-specific info fail the whole function
      console.error('Error getting platform-specific info:', error.message);
    }
    
    return info;
  }
  
  /**
   * Format uptime in a human-readable format
   * @param {number} uptime - Uptime in seconds
   * @returns {string} - Formatted uptime
   */
  static formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  }
  
  /**
   * Get information about the active window
   * @returns {Promise<Object>} - Active window information
   */
  static async getActiveWindow() {
    try {
      const windowInfo = await activeWindow();
      return windowInfo || null;
    } catch (error) {
      console.error('Error getting active window:', error.message);
      return null;
    }
  }
  
  /**
   * Send a system notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string} options.type - Notification type (info, warning, error)
   * @returns {Promise<boolean>} - Success status
   */
  static async sendNotification(options) {
    return new Promise((resolve) => {
      const notificationOptions = {
        title: options.title,
        message: options.message,
        sound: options.type === 'error', // Play sound only for errors
        wait: true
      };
      
      // Add icon based on type if available
      if (options.type === 'error') {
        notificationOptions.icon = path.join(__dirname, '../../assets/error-icon.png');
      } else if (options.type === 'warning') {
        notificationOptions.icon = path.join(__dirname, '../../assets/warning-icon.png');
      } else if (options.type === 'info') {
        notificationOptions.icon = path.join(__dirname, '../../assets/info-icon.png');
      }
      
      nodeNotifier.notify(notificationOptions, (err) => {
        if (err) {
          console.error('Error sending notification:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * Open a file or URL with the default application
   * @param {string} target - File path or URL to open
   * @returns {Promise<boolean>} - Success status
   */
  static async openWithDefaultApp(target) {
    try {
      let command;
      const args = [];
      
      if (os.platform() === 'win32') {
        command = 'start';
        args.push('""', target);
      } else if (os.platform() === 'darwin') {
        command = 'open';
        args.push(target);
      } else {
        command = 'xdg-open';
        args.push(target);
      }
      
      const childProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });
      
      childProcess.unref();
      return true;
    } catch (error) {
      console.error('Error opening with default app:', error.message);
      return false;
    }
  }
  
  /**
   * Run a shell command
   * @param {string} command - Command to run
   * @param {Object} options - Command options
   * @returns {Promise<Object>} - Command output
   */
  static async runCommand(command, options = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, options);
      return {
        success: true,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout
      };
    }
  }
  
  /**
   * Get the current mouse position
   * @returns {Object} - Mouse coordinates
   */
  static getMousePosition() {
    return robotjs.getMousePos();
  }
  
  /**
   * Get the current screen size
   * @returns {Object} - Screen dimensions
   */
  static getScreenSize() {
    return robotjs.getScreenSize();
  }
  
  /**
   * Get the pixel color at a specific screen coordinate
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - RGB color
   */
  static getPixelColor(x, y) {
    const hex = robotjs.getPixelColor(x, y);
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return {
      hex,
      rgb: { r, g, b }
    };
  }
  
  /**
   * Check if a path exists
   * @param {string} filePath - Path to check
   * @returns {boolean} - True if path exists
   */
  static pathExists(filePath) {
    return fs.existsSync(filePath);
  }
  
  /**
   * Create a directory if it doesn't exist
   * @param {string} dirPath - Directory path
   * @returns {boolean} - Success status
   */
  static ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error creating directory:', error.message);
      return false;
    }
  }
  
  /**
   * Is the current user likely to have admin/root privileges
   * @returns {Promise<boolean>} - True if admin/root
   */
  static async isAdminUser() {
    try {
      if (os.platform() === 'win32') {
        // On Windows, try to access a directory that requires admin rights
        const { stderr } = await execAsync('net session >nul 2>&1');
        return stderr ? false : true;
      } else {
        // On Unix systems, check if user ID is 0 (root)
        return os.userInfo().uid === 0;
      }
    } catch (error) {
      // If it fails, assume not admin
      return false;
    }
  }
}

// Export utility functions

/**
 * Get detailed system information
 * @returns {Promise<Object>} - System information
 */
export const getSystemInfo = async () => {
  return SystemService.getSystemInfo();
};

/**
 * Get information about the active window
 * @returns {Promise<Object>} - Active window information
 */
export const getActiveWindow = async () => {
  return SystemService.getActiveWindow();
};

/**
 * Send a system notification
 * @param {Object} options - Notification options
 * @returns {Promise<boolean>} - Success status
 */
export const sendNotification = async (options) => {
  return SystemService.sendNotification(options);
};

/**
 * Open a file or URL with the default application
 * @param {string} target - File path or URL to open
 * @returns {Promise<boolean>} - Success status
 */
export const openWithDefaultApp = async (target) => {
  return SystemService.openWithDefaultApp(target);
};

/**
 * Run a shell command
 * @param {string} command - Command to run
 * @param {Object} options - Command options
 * @returns {Promise<Object>} - Command output
 */
export const runCommand = async (command, options = {}) => {
  return SystemService.runCommand(command, options);
};

/**
 * Get the current mouse position
 * @returns {Object} - Mouse coordinates
 */
export const getMousePosition = () => {
  return SystemService.getMousePosition();
};

/**
 * Get the current screen size
 * @returns {Object} - Screen dimensions
 */
export const getScreenSize = () => {
  return SystemService.getScreenSize();
};

/**
 * Get the pixel color at a specific screen coordinate
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} - RGB color
 */
export const getPixelColor = (x, y) => {
  return SystemService.getPixelColor(x, y);
};

/**
 * Check if a path exists
 * @param {string} filePath - Path to check
 * @returns {boolean} - True if path exists
 */
export const pathExists = (filePath) => {
  return SystemService.pathExists(filePath);
};

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Directory path
 * @returns {boolean} - Success status
 */
export const ensureDirectoryExists = (dirPath) => {
  return SystemService.ensureDirectoryExists(dirPath);
};

/**
 * Is the current user likely to have admin/root privileges
 * @returns {Promise<boolean>} - True if admin/root
 */
export const isAdminUser = async () => {
  return SystemService.isAdminUser();
};

export default {
  getSystemInfo,
  getActiveWindow,
  sendNotification,
  openWithDefaultApp,
  runCommand,
  getMousePosition,
  getScreenSize,
  getPixelColor,
  pathExists,
  ensureDirectoryExists,
  isAdminUser
};
