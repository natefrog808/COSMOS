// examples/form-automation.js
// Example showing how to use COSMOS to automate form filling

import { COSMOS } from '../src/index.js';

async function runFormAutomation() {
  console.log('🚀 Starting COSMOS form automation example');
  
  // Initialize COSMOS agent
  const cosmos = await COSMOS.initialize({
    workspaceName: 'Form Automation Example'
  });
  
  // Start the agent
  const agent = cosmos.start();
  
  // Create a task for our automation
  await agent.run('addTask', {
    description: 'Fill out contact form on example.com',
    priority: 'high'
  });
  
  // Get system information
  await agent.run('getSystemInfo');
  
  // Capture the current screen
  await agent.run('takeScreenshot');
  
  // Analyze the screen to identify UI elements
  await agent.run('analyzeScreen');
  
  // Send a notification that we're starting
  await agent.run('sendNotification', {
    title: 'Form Automation Starting',
    message: 'Beginning to fill out the contact form',
    type: 'info'
  });
  
  // Find the form input fields
  const nameField = await agent.run('findElement', {
    type: 'text_field',
    text: 'Name'
  });
  
  // If we found the name field, interact with it
  if (nameField.elements && nameField.elements.length > 0) {
    await agent.run('interactWithElement', {
      elementId: nameField.elements[0].id,
      action: 'click'
    });
    
    await agent.run('typeText', {
      text: 'John Doe'
    });
  } else {
    console.log('Could not find name field');
  }
  
  // Continue with email field
  const emailField = await agent.run('findElement', {
    type: 'text_field',
    text: 'Email'
  });
  
  if (emailField.elements && emailField.elements.length > 0) {
    await agent.run('interactWithElement', {
      elementId: emailField.elements[0].id,
      action: 'click'
    });
    
    await agent.run('typeText', {
      text: 'john.doe@example.com'
    });
  }
  
  // Find and fill the message field
  const messageField = await agent.run('findElement', {
    type: 'text_field',
    text: 'Message'
  });
  
  if (messageField.elements && messageField.elements.length > 0) {
    await agent.run('interactWithElement', {
      elementId: messageField.elements[0].id,
      action: 'click'
    });
    
    await agent.run('typeText', {
      text: 'This is an automated message sent using COSMOS, the Comprehensive Operational System for Machine-Orchestrated Synthesis.'
    });
  }
  
  // Find the submit button
  const submitButton = await agent.run('findElement', {
    type: 'button',
    text: 'Submit'
  });
  
  // Click the submit button if found
  if (submitButton.elements && submitButton.elements.length > 0) {
    await agent.run('interactWithElement', {
      elementId: submitButton.elements[0].id,
      action: 'click'
    });
    
    // Wait for form submission
    await agent.run('wait', {
      milliseconds: 2000
    });
    
    // Take a screenshot of the result
    await agent.run('takeScreenshot', {
      savePath: './form-submission-result.png'
    });
    
    // Mark our task as complete
    const tasks = await agent.run('listTasks');
    if (tasks.length > 0) {
      await agent.run('completeTask', {
        taskId: tasks[0].id
      });
    }
    
    // Send a notification that we're done
    await agent.run('sendNotification', {
      title: 'Form Submission Complete',
      message: 'Successfully submitted the contact form',
      type: 'info'
    });
  } else {
    console.log('Could not find submit button');
    
    // Send error notification
    await agent.run('sendNotification', {
      title: 'Form Submission Failed',
      message: 'Could not find the submit button',
      type: 'error'
    });
  }
  
  // Record this workflow as a pattern for future use
  await agent.run('recordPattern', {
    name: 'ContactFormFill',
    description: 'Fill out a standard contact form with name, email and message'
  });
  
  console.log('✅ Form automation example completed');
}

// Run the example
runFormAutomation().catch(console.error);
