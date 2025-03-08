// src/utils/vision.js
// Computer vision utilities for COSMOS

import cv from 'opencv4nodejs';
import fs from 'fs';
import path from 'path';

/**
 * Computer Vision Service for UI element detection and analysis
 */
class VisionService {
  /**
   * Default options for element detection
   * @type {Object}
   */
  static DEFAULT_OPTIONS = {
    minElementArea: 500,       // Minimum area for an element in pixels
    edgeDetectionThreshold1: 50,  // First threshold for Canny edge detection
    edgeDetectionThreshold2: 150, // Second threshold for Canny edge detection
    contourApproximationMode: cv.CHAIN_APPROX_SIMPLE, // Contour approximation method
    contourRetrievalMode: cv.RETR_EXTERNAL,  // Only retrieve external contours
    maxElementCount: 1000       // Maximum number of elements to detect
  };

  /**
   * Load an image from file or buffer
   * @param {string|Buffer} source - Path to image file or image buffer
   * @returns {cv.Mat} - OpenCV matrix representation of the image
   */
  static loadImage(source) {
    try {
      if (typeof source === 'string') {
        // Load from file path
        return cv.imread(source);
      } else {
        // Decode from buffer
        return cv.imdecode(source);
      }
    } catch (error) {
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }

  /**
   * Save an image to file
   * @param {cv.Mat} image - OpenCV image to save
   * @param {string} filePath - Path where to save the image
   * @returns {boolean} - Success status
   */
  static saveImage(image, filePath) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cv.imwrite(filePath, image);
      return true;
    } catch (error) {
      console.error(`Failed to save image: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect UI elements in an image
   * @param {string|Buffer} image - Path to image file or image buffer
   * @param {Object} options - Detection options
   * @returns {Array<Object>} - Array of detected UI elements
   */
  static detectElements(image, options = {}) {
    // Merge options with defaults
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Load image
    const cvImage = this.loadImage(image);
    
    // Convert to grayscale for better edge detection
    const grayImage = cvImage.cvtColor(cv.COLOR_BGR2GRAY);
    
    // Apply blur to reduce noise if requested
    const processedImage = options.blurKernelSize 
      ? grayImage.gaussianBlur(
          new cv.Size(options.blurKernelSize, options.blurKernelSize), 
          0
        )
      : grayImage;
    
    // Detect edges
    const edges = processedImage.canny(
      config.edgeDetectionThreshold1, 
      config.edgeDetectionThreshold2
    );
    
    // Find contours (outlines of potential UI elements)
    const contours = edges.findContours(
      config.contourRetrievalMode,
      config.contourApproximationMode
    );
    
    // Filter and process contours into UI elements
    const elements = contours
      .filter(contour => contour.area > config.minElementArea)
      .slice(0, config.maxElementCount)
      .map((contour, index) => {
        // Get bounding rectangle
        const rect = contour.boundingRect();
        
        // Calculate aspect ratio
        const aspectRatio = rect.width / rect.height;
        
        // Determine element type based on shape characteristics
        let elementType = 'unknown';
        
        if (aspectRatio > 4) {
          elementType = 'text_field';
        } else if (aspectRatio >= 0.8 && aspectRatio <= 1.2 && rect.width < 100) {
          elementType = 'button';
        } else if (this.isCheckbox(contour, grayImage)) {
          elementType = 'checkbox';
        } else if (aspectRatio <= 0.1 || aspectRatio >= 10) {
          elementType = 'separator';
        }
        
        // Return element data
        return {
          id: `element-${index}`,
          type: elementType,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          area: contour.area,
          aspectRatio,
          center: {
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2)
          },
          contour: contour.getPoints()
        };
      });
    
    return elements;
  }

  /**
   * Detect if a contour is likely a checkbox
   * @param {cv.Contour} contour - Contour to check
   * @param {cv.Mat} grayImage - Grayscale image
   * @returns {boolean} - True if contour likely represents a checkbox
   */
  static isCheckbox(contour, grayImage) {
    const rect = contour.boundingRect();
    
    // Check if it's approximately square (checkboxes are usually square)
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio < 0.8 || aspectRatio > 1.2) {
      return false;
    }
    
    // Check if it's small enough (checkboxes are usually small)
    if (rect.width > 50 || rect.height > 50) {
      return false;
    }
    
    // Check approximation to see if it's a rectangle with 4 corners
    const epsilon = 0.05 * contour.arcLength(true);
    const approx = contour.approxPolyDP(epsilon, true);
    
    return approx.length === 4;
  }

  /**
   * Find potential text fields in an image
   * @param {string|Buffer} image - Path to image file or image buffer
   * @returns {Array<Object>} - Array of potential text fields
   */
  static detectTextFields(image) {
    // Implementation uses the generic detectElements with specialized filtering
    const elements = this.detectElements(image);
    
    // Filter for elements that are likely text fields
    return elements.filter(el => {
      // Text fields are usually rectangular with width > height
      const isRectangular = el.aspectRatio > 2.5 && el.aspectRatio < 15;
      
      // Text fields are usually medium-sized
      const isMediumSize = el.area > 5000 && el.area < 50000;
      
      return isRectangular && isMediumSize;
    });
  }

  /**
   * Find potential buttons in an image
   * @param {string|Buffer} image - Path to image file or image buffer 
   * @returns {Array<Object>} - Array of potential buttons
   */
  static detectButtons(image) {
    // Implementation uses the generic detectElements with specialized filtering
    const elements = this.detectElements(image);
    
    // Filter for elements that are likely buttons
    return elements.filter(el => {
      // Buttons typically have aspect ratios between 1:1 and 5:1
      const hasButtonRatio = el.aspectRatio >= 0.8 && el.aspectRatio <= 5;
      
      // Buttons are usually small to medium sized
      const hasButtonSize = el.area > 1000 && el.area < 20000;
      
      return hasButtonRatio && hasButtonSize;
    });
  }

  /**
   * Find UI elements based on template matching
   * @param {string|Buffer} image - Path to image file or image buffer
   * @param {string|Buffer} template - Path to template image or image buffer
   * @param {Object} options - Matching options
   * @param {number} options.threshold - Matching threshold (0.8-0.95 recommended)
   * @param {number} options.maxResults - Maximum number of matches to return
   * @returns {Array<Object>} - Array of matching elements
   */
  static findElementsByTemplate(image, template, options = { threshold: 0.8, maxResults: 5 }) {
    // Load images
    const cvImage = this.loadImage(image);
    const cvTemplate = this.loadImage(template);
    
    // Ensure template is smaller than the image
    if (cvTemplate.cols > cvImage.cols || cvTemplate.rows > cvImage.rows) {
      throw new Error('Template must be smaller than the target image');
    }
    
    // Perform template matching
    const matched = cvImage.matchTemplate(
      cvTemplate,
      cv.TM_CCOEFF_NORMED  // Normalized correlation coefficient matching method
    );
    
    // Find match locations above threshold
    const matchLocations = [];
    
    // Find points where match value exceeds threshold
    for (let y = 0; y < matched.rows; y++) {
      for (let x = 0; x < matched.cols; x++) {
        const value = matched.at(y, x);
        if (value > options.threshold) {
          matchLocations.push({
            x,
            y,
            width: cvTemplate.cols,
            height: cvTemplate.rows,
            confidence: value
          });
        }
      }
    }
    
    // Sort by confidence (highest first)
    matchLocations.sort((a, b) => b.confidence - a.confidence);
    
    // Take only the specified number of results
    const results = matchLocations
      .slice(0, options.maxResults)
      .map((match, index) => ({
        id: `template-match-${index}`,
        type: 'template-match',
        x: match.x,
        y: match.y,
        width: match.width,
        height: match.height,
        confidence: match.confidence,
        center: {
          x: Math.round(match.x + match.width / 2),
          y: Math.round(match.y + match.height / 2)
        }
      }));
    
    return results;
  }

  /**
   * Analyze the hierarchy of UI elements
   * @param {Array<Object>} elements - Detected UI elements
   * @returns {Array<Object>} - Elements with parent-child relationships
   */
  static analyzeElementHierarchy(elements) {
    // Create a copy of elements to avoid modifying the original
    const elementsWithHierarchy = [...elements];
    
    // Sort elements by area (largest first)
    elementsWithHierarchy.sort((a, b) => b.area - a.area);
    
    // For each element, find its parent
    for (let i = 1; i < elementsWithHierarchy.length; i++) {
      const element = elementsWithHierarchy[i];
      
      // Find a parent for this element
      for (let j = 0; j < i; j++) {
        const potentialParent = elementsWithHierarchy[j];
        
        // Check if this element is inside the potential parent
        if (
          element.x >= potentialParent.x &&
          element.y >= potentialParent.y &&
          element.x + element.width <= potentialParent.x + potentialParent.width &&
          element.y + element.height <= potentialParent.y + potentialParent.height
        ) {
          // This element is inside the potential parent
          element.parentId = potentialParent.id;
          
          // Add to parent's children if not already there
          potentialParent.children = potentialParent.children || [];
          if (!potentialParent.children.includes(element.id)) {
            potentialParent.children.push(element.id);
          }
          
          break; // No need to check other potential parents
        }
      }
    }
    
    return elementsWithHierarchy;
  }

  /**
   * Draw detected elements on an image
   * @param {string|Buffer} image - Path to image file or image buffer
   * @param {Array<Object>} elements - Detected UI elements
   * @param {Object} options - Drawing options
   * @returns {cv.Mat} - Image with drawn elements
   */
  static drawElements(image, elements, options = {}) {
    // Load image
    const cvImage = this.loadImage(image);
    
    // Create a copy to draw on
    const visualized = cvImage.copy();
    
    // Color map for different element types
    const colorMap = {
      button: new cv.Vec3(0, 255, 0),      // Green for buttons
      text_field: new cv.Vec3(0, 0, 255),  // Red for text fields
      checkbox: new cv.Vec3(255, 0, 255),  // Purple for checkboxes
      separator: new cv.Vec3(255, 255, 0), // Yellow for separators
      unknown: new cv.Vec3(150, 150, 150)  // Gray for unknown elements
    };
    
    // Draw each element
    elements.forEach(el => {
      // Get color for this element type
      const color = colorMap[el.type] || colorMap.unknown;
      
      // Draw rectangle
      visualized.drawRectangle(
        new cv.Point2(el.x, el.y),
        new cv.Point2(el.x + el.width, el.y + el.height),
        color,
        options.thickness || 2
      );
      
      // Draw ID text if requested
      if (options.showIds) {
        visualized.putText(
          el.id,
          new cv.Point2(el.x, el.y - 5),
          cv.FONT_HERSHEY_SIMPLEX,
          0.5,
          color,
          1
        );
      }
      
      // Draw type text if requested
      if (options.showTypes) {
        visualized.putText(
          el.type,
          new cv.Point2(el.x, el.y + el.height + 15),
          cv.FONT_HERSHEY_SIMPLEX,
          0.5,
          color,
          1
        );
      }
      
      // Draw center point if requested
      if (options.showCenters) {
        visualized.drawCircle(
          new cv.Point2(el.center.x, el.center.y),
          3,
          color,
          -1
        );
      }
    });
    
    return visualized;
  }

  /**
   * Crop a region from an image
   * @param {string|Buffer} image - Path to image file or image buffer
   * @param {Object} region - Region to crop {x, y, width, height}
   * @returns {cv.Mat} - Cropped image
   */
  static cropRegion(image, region) {
    // Load image
    const cvImage = this.loadImage(image);
    
    // Define region as OpenCV Rect
    const rect = new cv.Rect(region.x, region.y, region.width, region.height);
    
    // Crop the image
    return cvImage.getRegion(rect);
  }

  /**
   * Group elements that are aligned horizontally or vertically
   * @param {Array<Object>} elements - Detected UI elements
   * @param {Object} options - Grouping options
   * @returns {Object} - Object with horizontal and vertical groups
   */
  static groupAlignedElements(elements, options = { tolerance: 10 }) {
    const { tolerance } = options;
    
    // Group elements by vertical position (horizontal groups)
    const horizontalGroups = {};
    elements.forEach(el => {
      const centerY = el.center.y;
      
      // Find an existing group that this element could belong to
      let assigned = false;
      for (const groupKey in horizontalGroups) {
        const groupY = parseInt(groupKey, 10);
        if (Math.abs(groupY - centerY) <= tolerance) {
          horizontalGroups[groupKey].push(el);
          assigned = true;
          break;
        }
      }
      
      // If no existing group was found, create a new one
      if (!assigned) {
        horizontalGroups[centerY] = [el];
      }
    });
    
    // Group elements by horizontal position (vertical groups)
    const verticalGroups = {};
    elements.forEach(el => {
      const centerX = el.center.x;
      
      // Find an existing group that this element could belong to
      let assigned = false;
      for (const groupKey in verticalGroups) {
        const groupX = parseInt(groupKey, 10);
        if (Math.abs(groupX - centerX) <= tolerance) {
          verticalGroups[groupKey].push(el);
          assigned = true;
          break;
        }
      }
      
      // If no existing group was found, create a new one
      if (!assigned) {
        verticalGroups[centerX] = [el];
      }
    });
    
    // Sort elements within each group
    for (const key in horizontalGroups) {
      horizontalGroups[key].sort((a, b) => a.center.x - b.center.x);
    }
    
    for (const key in verticalGroups) {
      verticalGroups[key].sort((a, b) => a.center.y - b.center.y);
    }
    
    return {
      horizontal: horizontalGroups,
      vertical: verticalGroups
    };
  }
}

// Export utility functions

/**
 * Detect UI elements in an image
 * @param {string|Buffer} image - Path to image file or image buffer
 * @param {Object} options - Detection options
 * @returns {Array<Object>} - Array of detected UI elements
 */
export const detectElements = (image, options = {}) => {
  return VisionService.detectElements(image, options);
};

/**
 * Find text fields in an image
 * @param {string|Buffer} image - Path to image file or image buffer
 * @returns {Array<Object>} - Array of detected text fields
 */
export const detectTextFields = (image) => {
  return VisionService.detectTextFields(image);
};

/**
 * Find buttons in an image
 * @param {string|Buffer} image - Path to image file or image buffer
 * @returns {Array<Object>} - Array of detected buttons
 */
export const detectButtons = (image) => {
  return VisionService.detectButtons(image);
};

/**
 * Match a template image against a larger image
 * @param {string|Buffer} image - Path to image file or image buffer
 * @param {string|Buffer} template - Path to template image or image buffer
 * @param {Object} options - Matching options
 * @returns {Array<Object>} - Array of matching elements
 */
export const findElementsByTemplate = (image, template, options = {}) => {
  return VisionService.findElementsByTemplate(image, template, options);
};

/**
 * Analyze parent-child relationships between UI elements
 * @param {Array<Object>} elements - Detected UI elements
 * @returns {Array<Object>} - Elements with hierarchy information
 */
export const analyzeElementHierarchy = (elements) => {
  return VisionService.analyzeElementHierarchy(elements);
};

/**
 * Draw detected elements on an image for visualization
 * @param {string|Buffer} image - Path to image file or image buffer
 * @param {Array<Object>} elements - Detected UI elements
 * @param {Object} options - Drawing options
 * @returns {Buffer} - PNG image buffer
 */
export const visualizeElements = (image, elements, options = {}) => {
  const visualized = VisionService.drawElements(image, elements, options);
  return cv.imencode('.png', visualized);
};

/**
 * Save a visualization of detected elements
 * @param {string|Buffer} image - Path to image file or image buffer
 * @param {Array<Object>} elements - Detected UI elements
 * @param {string} outputPath - Path to save the visualization
 * @param {Object} options - Drawing options
 * @returns {boolean} - Success status
 */
export const saveElementVisualization = (image, elements, outputPath, options = {}) => {
  const visualized = VisionService.drawElements(image, elements, options);
  return VisionService.saveImage(visualized, outputPath);
};

/**
 * Crop a region from an image
 * @param {string|Buffer} image - Path to image file or image buffer
 * @param {Object} region - Region to crop {x, y, width, height}
 * @returns {Buffer} - PNG image buffer of the cropped region
 */
export const cropRegion = (image, region) => {
  const cropped = VisionService.cropRegion(image, region);
  return cv.imencode('.png', cropped);
};

/**
 * Group UI elements that are aligned horizontally or vertically
 * @param {Array<Object>} elements - Detected UI elements
 * @param {Object} options - Grouping options
 * @returns {Object} - Object with horizontal and vertical groups
 */
export const groupAlignedElements = (elements, options = {}) => {
  return VisionService.groupAlignedElements(elements, options);
};

/**
 * Load an image from file or buffer
 * @param {string|Buffer} source - Path to image or image buffer
 * @returns {cv.Mat} - OpenCV image matrix
 */
export const loadImage = (source) => {
  return VisionService.loadImage(source);
};

/**
 * Save an image to file
 * @param {cv.Mat} image - OpenCV image to save
 * @param {string} filePath - Path where to save the image
 * @returns {boolean} - Success status
 */
export const saveImage = (image, filePath) => {
  return VisionService.saveImage(image, filePath);
};

export default {
  detectElements,
  detectTextFields,
  detectButtons,
  findElementsByTemplate,
  analyzeElementHierarchy,
  visualizeElements,
  saveElementVisualization,
  cropRegion,
  groupAlignedElements,
  loadImage,
  saveImage
};
