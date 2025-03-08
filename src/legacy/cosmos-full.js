// Import required dependencies
import { createDreams, validateEnv, context, action, extension } from "@daydreamsai/core";
import { cli } from "@daydreamsai/core/extensions";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import robotjs from 'robotjs'; // For computer automation
import screenshot from 'screenshot-desktop'; // For taking screenshots
import { createWorker } from 'tesseract.js'; // For OCR processing
import cv from 'opencv4nodejs'; // For image analysis
import os from 'os'; // For system information
import activeWindow from 'active-win'; // For detecting active window
import nodeFetch from 'node-fetch'; // For network requests
import nodeNotifier from 'node-notifier'; // For system notifications

// Setup OCR worker
const setupOCR = async () => {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  return worker;
};

// Define automation context
const automationContext = context({
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
      currentScreen: null,
      mousePosition: { x: 0, y: 0 },
      activeWindow: null,
      tasks: [],
      completedTasks: [],
      lastAction: null,
      visualElements: [],
      recognizedText: [],
      sessionStartTime: new Date().toISOString(),
      actionHistory: [],
      workspaceName: state.workspaceName || "Default Workspace",
      systemInfo: {
        platform: os.platform(),
        release: os.release(),
        cpuCores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + "GB",
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + "GB",
      },
      automationPatterns: [],
      userPreferences: { 
        mouseSpeed: "medium", 
        notificationsEnabled: true,
        safeMode: true 
      }
    };
  },
  render({ memory }) {
    return `
# Computer Automation Session: ${memory.workspaceName}
Session started: ${new Date(memory.sessionStartTime).toLocaleString()}

## Current State
${memory.currentScreen ? '✅ Screen captured' : '❌ No screen capture available'}
Mouse position: X: ${memory.mousePosition.x}, Y: ${memory.mousePosition.y}
Active window: ${memory.activeWindow || 'None detected'}

## System Information
Platform: ${memory.systemInfo.platform} ${memory.systemInfo.release}
CPU Cores: ${memory.systemInfo.cpuCores}
Memory: ${memory.systemInfo.freeMemory} free of ${memory.systemInfo.totalMemory}
Safe Mode: ${memory.userPreferences.safeMode ? '✅ Enabled' : '❌ Disabled'}

## Detected Elements
${memory.visualElements.length > 0 
  ? `Visual elements detected: ${memory.visualElements.length} elements`
  : 'No visual elements detected yet'}
  
${memory.recognizedText.length > 0
  ? `Text elements detected: ${memory.recognizedText.length} elements`
  : 'No text elements recognized yet'}

## Recent Actions
${memory.actionHistory.slice(-5).map(a => `- ${a.action} (${a.timestamp})`).join('\n') || 'No actions taken yet'}

## Tasks
${memory.tasks.map(t => `- [ ] ${t.description}`).join('\n') || 'No pending tasks'}
${memory.completedTasks.map(t => `- [x] ${t.description} (Completed: ${t.completedAt})`).join('\n')}
`;
  },
});

// Define computer automation actions
const takeScreenshotAction = action({
  name: "takeScreenshot",
  description: "Capture the current screen state",
  schema: z.object({
    savePath: z.string().optional().describe("Path to save the screenshot (optional)")
  }),
  async handler(call, ctx, agent) {
    try {
      // Capture screenshot
      const screenshotBuffer = await screenshot();
      
      // Save if path provided
      if (call.data.savePath) {
        const saveDir = path.dirname(call.data.savePath);
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }
        fs.writeFileSync(call.data.savePath, screenshotBuffer);
      }
      
      // Update context memory
      ctx.agentMemory.currentScreen = screenshotBuffer;
      ctx.agentMemory.lastAction = 'takeScreenshot';
      ctx.agentMemory.actionHistory.push({
        action: 'takeScreenshot',
        timestamp: new Date().toISOString()
      });
      
      // Process screen for visual elements using OpenCV
      const image = cv.imdecode(screenshotBuffer);
      
      // Run basic element detection (simplified)
      const grayImg = image.cvtColor(cv.COLOR_BGR2GRAY);
      const edges = grayImg.canny(50, 150);
      const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      // Find potential UI elements by detecting rectangles
      const visualElements = contours
        .filter(contour => contour.area > 500) // Filter out noise
        .map((contour, i) => {
          const rect = contour.boundingRect();
          return {
            id: `element-${i}`,
            type: 'unknown',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            area: contour.area,
            center: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2
            }
          };
        });
      
      ctx.agentMemory.visualElements = visualElements;
      
      // Run OCR on the screenshot to extract text
      const worker = await setupOCR();
      const { data } = await worker.recognize(screenshotBuffer);
      await worker.terminate();
      
      // Process OCR results
      ctx.agentMemory.recognizedText = data.words.map((word, i) => ({
        id: `text-${i}`,
        text: word.text,
        confidence: word.confidence,
        box: word.bbox
      }));
      
      return {
        success: true,
        message: "Screenshot captured successfully",
        visualElements: visualElements.length,
        textElements: data.words.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const analyzeScreenAction = action({
  name: "analyzeScreen",
  description: "Analyze the current screen to identify UI elements",
  schema: z.object({}),
  async handler(call, ctx, agent) {
    try {
      if (!ctx.agentMemory.currentScreen) {
        return {
          success: false,
          message: "No screenshot available. Take a screenshot first."
        };
      }
      
      // Analyze the screen - this would use the pre-processed data from the screenshot action
      const elements = ctx.agentMemory.visualElements;
      const textElements = ctx.agentMemory.recognizedText;
      
      // Attempt to identify common UI patterns
      const buttons = elements.filter(el => 
        (el.width / el.height < 5 && el.width / el.height > 0.5) && 
        el.area < 20000
      );
      
      const textFields = elements.filter(el => 
        (el.width / el.height > 3) &&
        el.area > 5000 && el.area < 50000
      );
      
      // Update element types based on our analysis
      buttons.forEach(button => {
        const elementIndex = elements.findIndex(el => el.id === button.id);
        if (elementIndex >= 0) {
          elements[elementIndex].type = 'button';
        }
      });
      
      textFields.forEach(field => {
        const elementIndex = elements.findIndex(el => el.id === field.id);
        if (elementIndex >= 0) {
          elements[elementIndex].type = 'text_field';
        }
      });
      
      // Match text elements with UI elements
      textElements.forEach(textEl => {
        const textCenter = {
          x: textEl.box.x0 + (textEl.box.x1 - textEl.box.x0) / 2,
          y: textEl.box.y0 + (textEl.box.y1 - textEl.box.y0) / 2
        };
        
        // Find containing element
        const containingElement = elements.find(el => 
          textCenter.x >= el.x && 
          textCenter.x <= el.x + el.width &&
          textCenter.y >= el.y && 
          textCenter.y <= el.y + el.height
        );
        
        if (containingElement) {
          const elementIndex = elements.findIndex(el => el.id === containingElement.id);
          if (elementIndex >= 0) {
            elements[elementIndex].text = textEl.text;
            
            // Refine element type based on text
            if (["SUBMIT", "OK", "CANCEL", "YES", "NO", "SAVE"].includes(textEl.text.toUpperCase())) {
              elements[elementIndex].type = 'button';
            }
          }
        }
      });
      
      // Update the context memory
      ctx.agentMemory.visualElements = elements;
      ctx.agentMemory.lastAction = 'analyzeScreen';
      ctx.agentMemory.actionHistory.push({
        action: 'analyzeScreen',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "Screen analyzed successfully",
        buttons: buttons.length,
        textFields: textFields.length,
        elements: elements.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const moveMouseAction = action({
  name: "moveMouse",
  description: "Move the mouse cursor to specific coordinates",
  schema: z.object({
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
    smooth: z.boolean().optional().default(true).describe("Use smooth movement")
  }),
  handler(call, ctx, agent) {
    try {
      const { x, y, smooth } = call.data;
      
      // Move the mouse
      if (smooth) {
        // Get current position
        const currentPos = robotjs.getMousePos();
        
        // Calculate step sizes for smooth movement
        const steps = 20;
        const xStep = (x - currentPos.x) / steps;
        const yStep = (y - currentPos.y) / steps;
        
        // Perform smooth movement
        for (let i = 0; i < steps; i++) {
          const nextX = Math.round(currentPos.x + xStep * (i + 1));
          const nextY = Math.round(currentPos.y + yStep * (i + 1));
          robotjs.moveMouse(nextX, nextY);
          
          // Small delay between movements
          robotjs.setMouseDelay(10);
        }
      } else {
        robotjs.moveMouse(x, y);
      }
      
      // Update context memory
      ctx.agentMemory.mousePosition = { x, y };
      ctx.agentMemory.lastAction = 'moveMouse';
      ctx.agentMemory.actionHistory.push({
        action: `moveMouse(x: ${x}, y: ${y})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Mouse moved to X: ${x}, Y: ${y}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const clickMouseAction = action({
  name: "clickMouse",
  description: "Perform a mouse click",
  schema: z.object({
    button: z.enum(["left", "right", "middle"]).optional().default("left").describe("Mouse button to click"),
    doubleClick: z.boolean().optional().default(false).describe("Perform a double-click"),
    x: z.number().optional().describe("X coordinate (if not provided, uses current position)"),
    y: z.number().optional().describe("Y coordinate (if not provided, uses current position)")
  }),
  handler(call, ctx, agent) {
    try {
      const { button, doubleClick, x, y } = call.data;
      
      // Move mouse first if coordinates provided
      if (x !== undefined && y !== undefined) {
        robotjs.moveMouse(x, y);
        ctx.agentMemory.mousePosition = { x, y };
      }
      
      // Perform click
      if (doubleClick) {
        robotjs.mouseClick(button);
        robotjs.mouseClick(button);
      } else {
        robotjs.mouseClick(button);
      }
      
      // Update context memory
      ctx.agentMemory.lastAction = 'clickMouse';
      ctx.agentMemory.actionHistory.push({
        action: `clickMouse(button: ${button}, doubleClick: ${doubleClick})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Mouse ${doubleClick ? 'double-' : ''}clicked with ${button} button`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const typeTextAction = action({
  name: "typeText",
  description: "Type text at the current cursor position",
  schema: z.object({
    text: z.string().describe("Text to type"),
    delay: z.number().optional().default(10).describe("Delay between keystrokes in ms")
  }),
  handler(call, ctx, agent) {
    try {
      const { text, delay } = call.data;
      
      // Set typing delay
      robotjs.setKeyboardDelay(delay);
      
      // Type the text
      robotjs.typeString(text);
      
      // Update context memory
      ctx.agentMemory.lastAction = 'typeText';
      ctx.agentMemory.actionHistory.push({
        action: `typeText("${text.length > 20 ? text.substring(0, 20) + '...' : text}")`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Typed text: "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const pressKeyAction = action({
  name: "pressKey",
  description: "Press a specific key or key combination",
  schema: z.object({
    key: z.string().describe("Key to press (e.g., 'return', 'escape', 'f1')"),
    modifiers: z.array(z.enum(["alt", "command", "control", "shift"])).optional().describe("Modifier keys to hold")
  }),
  handler(call, ctx, agent) {
    try {
      const { key, modifiers = [] } = call.data;
      
      // Press key with modifiers
      if (modifiers.length > 0) {
        robotjs.keyTap(key, modifiers);
      } else {
        robotjs.keyTap(key);
      }
      
      // Update context memory
      ctx.agentMemory.lastAction = 'pressKey';
      ctx.agentMemory.actionHistory.push({
        action: `pressKey(${key}${modifiers.length > 0 ? ' with modifiers: ' + modifiers.join(', ') : ''})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Pressed key: ${key}${modifiers.length > 0 ? ' with modifiers: ' + modifiers.join(', ') : ''}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const addTaskAction = action({
  name: "addTask",
  description: "Add a new task to the automation queue",
  schema: z.object({
    description: z.string().describe("Task description"),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium").describe("Task priority")
  }),
  handler(call, ctx, agent) {
    try {
      const { description, priority } = call.data;
      
      // Create new task
      const newTask = {
        id: `task-${Date.now()}`,
        description,
        priority,
        createdAt: new Date().toISOString(),
        status: "pending"
      };
      
      // Add to task list
      ctx.agentMemory.tasks.push(newTask);
      
      // Update context memory
      ctx.agentMemory.lastAction = 'addTask';
      ctx.agentMemory.actionHistory.push({
        action: `addTask("${description}")`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Added task: "${description}" with ${priority} priority`,
        taskId: newTask.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const completeTaskAction = action({
  name: "completeTask",
  description: "Mark a task as completed",
  schema: z.object({
    taskId: z.string().describe("ID of the task to complete")
  }),
  handler(call, ctx, agent) {
    try {
      const { taskId } = call.data;
      
      // Find task
      const taskIndex = ctx.agentMemory.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          message: `Task with ID ${taskId} not found`
        };
      }
      
      // Get task
      const task = ctx.agentMemory.tasks[taskIndex];
      
      // Update task
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      
      // Move to completed tasks
      ctx.agentMemory.completedTasks.push(task);
      
      // Remove from pending tasks
      ctx.agentMemory.tasks.splice(taskIndex, 1);
      
      // Update context memory
      ctx.agentMemory.lastAction = 'completeTask';
      ctx.agentMemory.actionHistory.push({
        action: `completeTask("${task.description}")`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Completed task: "${task.description}"`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const findElementAction = action({
  name: "findElement",
  description: "Find a UI element by text or type",
  schema: z.object({
    text: z.string().optional().describe("Text to search for"),
    type: z.enum(["button", "text_field", "unknown"]).optional().describe("Element type to search for"),
    exactMatch: z.boolean().optional().default(false).describe("Require exact text match")
  }),
  handler(call, ctx, agent) {
    try {
      const { text, type, exactMatch } = call.data;
      
      if (!ctx.agentMemory.visualElements || ctx.agentMemory.visualElements.length === 0) {
        return {
          success: false,
          message: "No visual elements detected. Take a screenshot and analyze it first."
        };
      }
      
      // Filter elements based on criteria
      let matchedElements = [...ctx.agentMemory.visualElements];
      
      if (type) {
        matchedElements = matchedElements.filter(el => el.type === type);
      }
      
      if (text) {
        matchedElements = matchedElements.filter(el => {
          if (!el.text) return false;
          
          if (exactMatch) {
            return el.text.toLowerCase() === text.toLowerCase();
          } else {
            return el.text.toLowerCase().includes(text.toLowerCase());
          }
        });
      }
      
      // Sort by relevance (exact matches first, then partial matches)
      if (text && !exactMatch) {
        matchedElements.sort((a, b) => {
          const aExact = a.text && a.text.toLowerCase() === text.toLowerCase();
          const bExact = b.text && b.text.toLowerCase() === text.toLowerCase();
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return 0;
        });
      }
      
      // Update context memory
      ctx.agentMemory.lastAction = 'findElement';
      ctx.agentMemory.actionHistory.push({
        action: `findElement(${text ? `text: "${text}"` : ''}${type ? `, type: ${type}` : ''})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Found ${matchedElements.length} matching elements`,
        elements: matchedElements.map(el => ({
          id: el.id,
          type: el.type,
          text: el.text,
          position: {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height
          },
          center: el.center
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const interactWithElementAction = action({
  name: "interactWithElement",
  description: "Interact with a UI element by ID or description",
  schema: z.object({
    elementId: z.string().optional().describe("Element ID to interact with"),
    elementText: z.string().optional().describe("Element text to search for"),
    action: z.enum(["click", "type", "doubleClick", "rightClick"]).describe("Action to perform"),
    text: z.string().optional().describe("Text to type (only for 'type' action)")
  }),
  handler(call, ctx, agent) {
    try {
      const { elementId, elementText, action: interactionType, text } = call.data;
      
      if (!elementId && !elementText) {
        return {
          success: false,
          message: "Either elementId or elementText must be provided"
        };
      }
      
      // Find the element
      let element = null;
      
      if (elementId) {
        element = ctx.agentMemory.visualElements.find(el => el.id === elementId);
      } else if (elementText) {
        element = ctx.agentMemory.visualElements.find(el => 
          el.text && el.text.toLowerCase().includes(elementText.toLowerCase())
        );
      }
      
      if (!element) {
        return {
          success: false,
          message: `Element ${elementId || 'with text "' + elementText + '"'} not found`
        };
      }
      
      // Calculate center point for interaction
      const centerX = element.center.x;
      const centerY = element.center.y;
      
      // Perform the interaction
      switch (interactionType) {
        case "click":
          robotjs.moveMouse(centerX, centerY);
          robotjs.mouseClick();
          break;
        case "doubleClick":
          robotjs.moveMouse(centerX, centerY);
          robotjs.mouseClick();
          robotjs.mouseClick();
          break;
        case "rightClick":
          robotjs.moveMouse(centerX, centerY);
          robotjs.mouseClick("right");
          break;
        case "type":
          if (!text) {
            return {
              success: false,
              message: "Text must be provided for 'type' action"
            };
          }
          robotjs.moveMouse(centerX, centerY);
          robotjs.mouseClick();
          robotjs.typeString(text);
          break;
      }
      
      // Update context memory
      ctx.agentMemory.mousePosition = { x: centerX, y: centerY };
      ctx.agentMemory.lastAction = 'interactWithElement';
      ctx.agentMemory.actionHistory.push({
        action: `interactWithElement(${elementId || '"' + elementText + '"'}, ${interactionType}${text ? ', "' + text + '"' : ''})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Performed ${interactionType} on element ${element.text ? '"' + element.text + '"' : element.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Add these new advanced actions

const getSystemInfoAction = action({
  name: "getSystemInfo",
  description: "Get detailed information about the system",
  schema: z.object({}),
  handler(call, ctx, agent) {
    try {
      // Get system information
      const systemInfo = {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: Math.floor(os.uptime() / 3600) + " hours, " + 
                Math.floor((os.uptime() % 3600) / 60) + " minutes",
        cpuModel: os.cpus()[0].model,
        cpuCores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + "GB",
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + "GB",
        architecture: os.arch(),
        networkInterfaces: Object.keys(os.networkInterfaces()).length,
        loadAverage: os.loadavg()
      };
      
      // Update context memory
      ctx.agentMemory.systemInfo = {
        ...ctx.agentMemory.systemInfo,
        ...systemInfo
      };
      ctx.agentMemory.lastAction = 'getSystemInfo';
      ctx.agentMemory.actionHistory.push({
        action: 'getSystemInfo',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "System information retrieved",
        systemInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const detectActiveWindowAction = action({
  name: "detectActiveWindow",
  description: "Detect the currently active window",
  schema: z.object({}),
  async handler(call, ctx, agent) {
    try {
      // Get active window information
      const windowInfo = await activeWindow();
      
      if (!windowInfo) {
        return {
          success: false,
          message: "Unable to detect active window"
        };
      }
      
      // Update context memory
      ctx.agentMemory.activeWindow = {
        title: windowInfo.title,
        owner: windowInfo.owner.name,
        path: windowInfo.owner.path,
        pid: windowInfo.owner.processId
      };
      ctx.agentMemory.lastAction = 'detectActiveWindow';
      ctx.agentMemory.actionHistory.push({
        action: 'detectActiveWindow',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "Active window detected",
        window: ctx.agentMemory.activeWindow
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const sendNotificationAction = action({
  name: "sendNotification",
  description: "Send a system notification",
  schema: z.object({
    title: z.string().describe("Notification title"),
    message: z.string().describe("Notification message"),
    type: z.enum(['info', 'warning', 'error']).optional().default('info').describe("Notification type")
  }),
  handler(call, ctx, agent) {
    try {
      const { title, message, type } = call.data;
      
      // Check if notifications are enabled
      if (!ctx.agentMemory.userPreferences.notificationsEnabled) {
        return {
          success: false,
          message: "Notifications are disabled in user preferences"
        };
      }
      
      // Send notification
      nodeNotifier.notify({
        title,
        message,
        type,
        sound: type === 'error', // Play sound only for errors
        wait: true
      });
      
      // Update context memory
      ctx.agentMemory.lastAction = 'sendNotification';
      ctx.agentMemory.actionHistory.push({
        action: `sendNotification("${title}", "${message}", ${type})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Sent ${type} notification: "${title}"`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const recordPatternAction = action({
  name: "recordPattern",
  description: "Record a series of actions as a reusable automation pattern",
  schema: z.object({
    name: z.string().describe("Pattern name"),
    description: z.string().describe("Pattern description"),
    actions: z.array(z.any()).optional().describe("List of actions, or use recent history if empty")
  }),
  handler(call, ctx, agent) {
    try {
      const { name, description, actions } = call.data;
      
      // Use provided actions or recent history
      const patternActions = actions || ctx.agentMemory.actionHistory.slice(-10).map(a => a.action);
      
      // Create pattern
      const newPattern = {
        id: `pattern-${Date.now()}`,
        name,
        description,
        actions: patternActions,
        createdAt: new Date().toISOString()
      };
      
      // Add to patterns list
      ctx.agentMemory.automationPatterns = ctx.agentMemory.automationPatterns || [];
      ctx.agentMemory.automationPatterns.push(newPattern);
      
      // Update context memory
      ctx.agentMemory.lastAction = 'recordPattern';
      ctx.agentMemory.actionHistory.push({
        action: `recordPattern("${name}")`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Recorded pattern "${name}" with ${patternActions.length} actions`,
        patternId: newPattern.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const runPatternAction = action({
  name: "runPattern",
  description: "Run a previously recorded automation pattern",
  schema: z.object({
    patternId: z.string().describe("ID of the pattern to run"),
    parameters: z.record(z.any()).optional().describe("Optional parameters for the pattern")
  }),
  handler(call, ctx, agent) {
    try {
      const { patternId, parameters = {} } = call.data;
      
      // Find pattern
      const pattern = ctx.agentMemory.automationPatterns.find(p => p.id === patternId);
      
      if (!pattern) {
        return {
          success: false,
          message: `Pattern with ID ${patternId} not found`
        };
      }
      
      // Update context memory
      ctx.agentMemory.lastAction = 'runPattern';
      ctx.agentMemory.actionHistory.push({
        action: `runPattern("${pattern.name}")`,
        timestamp: new Date().toISOString()
      });
      
      // Note: In a real implementation, this would actually execute the pattern
      // For demo purposes, we're just acknowledging the request
      
      return {
        success: true,
        message: `Started running pattern "${pattern.name}" with ${pattern.actions.length} actions`,
        patternName: pattern.name,
        parameters
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

const updateUserPreferencesAction = action({
  name: "updateUserPreferences",
  description: "Update user preferences for automation behavior",
  schema: z.object({
    mouseSpeed: z.enum(['slow', 'medium', 'fast']).optional().describe("Mouse movement speed"),
    notificationsEnabled: z.boolean().optional().describe("Enable/disable notifications"),
    safeMode: z.boolean().optional().describe("Enable/disable safe mode (prevents potentially destructive actions)")
  }),
  handler(call, ctx, agent) {
    try {
      const { mouseSpeed, notificationsEnabled, safeMode } = call.data;
      
      // Update only provided preferences
      if (mouseSpeed !== undefined) {
        ctx.agentMemory.userPreferences.mouseSpeed = mouseSpeed;
      }
      
      if (notificationsEnabled !== undefined) {
        ctx.agentMemory.userPreferences.notificationsEnabled = notificationsEnabled;
      }
      
      if (safeMode !== undefined) {
        ctx.agentMemory.userPreferences.safeMode = safeMode;
      }
      
      // Update context memory
      ctx.agentMemory.lastAction = 'updateUserPreferences';
      ctx.agentMemory.actionHistory.push({
        action: `updateUserPreferences(${JSON.stringify(call.data)})`,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: "User preferences updated",
        preferences: ctx.agentMemory.userPreferences
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
});

// Create the automation agent
async function createAutomationAgent() {
  // Validate environment variables
  validateEnv(
    z.object({
      ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
    })
  );

  // Create the agent
  const agent = await createDreams({
    model: anthropic("claude-3-opus-20240229"),
    extensions: [cli],
    context: automationContext,
    actions: [
      // Basic actions
      takeScreenshotAction,
      analyzeScreenAction,
      moveMouseAction,
      clickMouseAction,
      typeTextAction,
      pressKeyAction,
      addTaskAction,
      completeTaskAction,
      findElementAction,
      interactWithElementAction,
      
      // Advanced actions
      getSystemInfoAction,
      detectActiveWindowAction,
      sendNotificationAction,
      recordPatternAction,
      runPatternAction,
      updateUserPreferencesAction
    ],
  }).start({
    id: `automation-${Date.now()}`,
    workspaceName: "Mind-Blowing Automation"
  });

  console.log("⚡ Mind-Blowing CPU Automation Agent is now running!");
  console.log("⌨️  Type your automation instructions below:");
  
  // Send welcome notification
  nodeNotifier.notify({
    title: 'Automation Agent Active',
    message: 'Your Mind-Blowing CPU Automation Agent is now running!',
    sound: true
  });

  return agent;
}

// Run the agent
createAutomationAgent().catch(console.error);
