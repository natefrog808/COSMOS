// context/automationContext.js
// Defines the main automation context for COSMOS

import { context } from '@daydreamsai/core';
import { z } from 'zod';
import os from 'os';

/**
 * The primary automation context for COSMOS
 * Maintains all state information for the automation agent
 */
export const automationContext = context({
  type: "computer-automation",
  schema: z.object({
    id: z.string().describe("Unique session identifier"),
    workspaceName: z.string().optional().describe("Name of the current workspace")
  }),
  key({ id }) {
    return `automation-${id}`;
  },
  create(state) {
    return {
      // Screen and input state
      currentScreen: null,
      mousePosition: { x: 0, y: 0 },
      activeWindow: null,
      visualElements: [],
      recognizedText: [],
      
      // Task management
      tasks: [],
      completedTasks: [],
      
      // History tracking
      lastAction: null,
      actionHistory: [],
      sessionStartTime: new Date().toISOString(),
      
      // System information
      systemInfo: {
        platform: os.platform(),
        release: os.release(),
        cpuCores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + "GB",
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + "GB",
      },
      
      // Automation capabilities
      automationPatterns: [],
      
      // User configuration
      workspaceName: state.workspaceName || "COSMOS Automation",
      userPreferences: { 
        mouseSpeed: "medium", 
        notificationsEnabled: true,
        safeMode: true 
      }
    };
  },
  render({ memory }) {
    return `
# COSMOS Automation: ${memory.workspaceName}
Session started: ${new Date(memory.sessionStartTime).toLocaleString()}

## Current State
${memory.currentScreen ? '✅ Screen captured' : '❌ No screen capture available'}
Mouse position: X: ${memory.mousePosition.x}, Y: ${memory.mousePosition.y}
Active window: ${memory.activeWindow ? `"${memory.activeWindow.title}" (${memory.activeWindow.owner})` : 'None detected'}

## System Information
Platform: ${memory.systemInfo.platform} ${memory.systemInfo.release}
CPU Cores: ${memory.systemInfo.cpuCores}
Memory: ${memory.systemInfo.freeMemory} free of ${memory.systemInfo.totalMemory}
Safe Mode: ${memory.userPreferences.safeMode ? '✅ Enabled' : '❌ Disabled'}

## Detected Elements
${memory.visualElements.length > 0 
  ? `Visual elements detected: ${memory.visualElements.length} elements\n` +
    `${memory.visualElements.slice(0, 5).map(el => 
      `- ${el.type} ${el.text ? `"${el.text}"` : ''} at (${el.center.x}, ${el.center.y})`
    ).join('\n')}` +
    (memory.visualElements.length > 5 ? `\n...and ${memory.visualElements.length - 5} more` : '')
  : 'No visual elements detected yet'}
  
${memory.recognizedText.length > 0
  ? `Text elements detected: ${memory.recognizedText.length} elements\n` +
    `${memory.recognizedText.slice(0, 5).map(t => 
      `- "${t.text}" (confidence: ${Math.round(t.confidence)}%)`
    ).join('\n')}` +
    (memory.recognizedText.length > 5 ? `\n...and ${memory.recognizedText.length - 5} more` : '')
  : 'No text elements recognized yet'}

## Recent Actions
${memory.actionHistory.slice(-5).map(a => `- ${a.action} (${new Date(a.timestamp).toLocaleTimeString()})`).join('\n') || 'No actions taken yet'}

## Tasks
${memory.tasks.map(t => `- [ ] ${t.description} (${t.priority} priority)`).join('\n') || 'No pending tasks'}
${memory.completedTasks.length > 0 ? '## Completed Tasks' : ''}
${memory.completedTasks.slice(0, 3).map(t => `- [x] ${t.description} (completed: ${new Date(t.completedAt).toLocaleString()})`).join('\n')}
${memory.completedTasks.length > 3 ? `...and ${memory.completedTasks.length - 3} more completed tasks` : ''}

## Available Automation Patterns
${memory.automationPatterns && memory.automationPatterns.length > 0
  ? memory.automationPatterns.map(p => `- "${p.name}": ${p.description} (${p.actions.length} actions)`).join('\n')
  : 'No automation patterns recorded yet'}
`;
  },
});

export default automationContext;
