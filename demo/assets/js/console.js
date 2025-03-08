// Advanced console functionality for the demo
function initConsole() {
    const consoleInput = document.querySelector('.console-input input');
    const consoleBody = document.querySelector('.console-body');
    const commandHistory = [];
    let historyIndex = -1;
    
    // Command input handling
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = consoleInput.value.trim();
            
            if (command) {
                // Add to history
                commandHistory.push(command);
                historyIndex = commandHistory.length;
                
                // Clear input
                consoleInput.value = '';
                
                // Process command
                processConsoleCommand(command);
            }
        } else if (e.key === 'ArrowUp') {
            // Navigate command history (up)
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                consoleInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            // Navigate command history (down)
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                consoleInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                consoleInput.value = '';
            }
        }
    });
    
    // Process commands with simulated AI agent responses
    function processConsoleCommand(command) {
        // Add the command to the console
        const promptElement = document.createElement('div');
        promptElement.className = 'console-prompt';
        promptElement.innerHTML = `
            <span class="console-prompt-symbol">$</span>
            <span>${command}</span>
        `;
        consoleBody.appendChild(promptElement);
        
        // Create response based on command
        const responseElement = document.createElement('div');
        responseElement.className = 'console-response';
        
        // Simulated command processing with delays for realism
        responseElement.innerHTML = 'Processing...';
        consoleBody.appendChild(responseElement);
        consoleBody.scrollTop = consoleBody.scrollHeight;
        
        setTimeout(() => {
            // Determine command type and generate appropriate response
            if (command.match(/help|--help|-h/i)) {
                responseElement.innerHTML = getHelpResponse();
            } else if (command.match(/capture-screen|screenshot|screen/i)) {
                responseElement.innerHTML = getCaptureScreenResponse();
                showToast('success', 'Screenshot Captured', 'Screen analysis complete');
            } else if (command.match(/find-element|find|search/i)) {
                responseElement.innerHTML = getFindElementResponse(command);
            } else if (command.match(/interact|click|type/i)) {
                responseElement.innerHTML = getInteractResponse(command);
            } else if (command.match(/record-pattern|record|save/i)) {
                responseElement.innerHTML = getRecordPatternResponse(command);
            } else if (command.match(/run-pattern|run|execute/i)) {
                responseElement.innerHTML = getRunPatternResponse(command);
            } else if (command.match(/system-info|info|status/i)) {
                responseElement.innerHTML = getSystemInfoResponse();
            } else if (command.match(/clear|cls/i)) {
                // Clear console
                while (consoleBody.firstChild) {
                    consoleBody.removeChild(consoleBody.firstChild);
                }
                return;
            } else {
                responseElement.innerHTML = getUnknownCommandResponse(command);
            }
            
            // Scroll to bottom
            consoleBody.scrollTop = consoleBody.scrollHeight;
        }, 500); // Simulate processing delay
    }
    
    // Predefined responses for different command types
    function getHelpResponse() {
        return `
            Available commands:<br>
            <span class="console-success">cosmos init [--workspace=name]</span> - Initialize COSMOS agent<br>
            <span class="console-success">cosmos capture-screen [--save=path]</span> - Take a screenshot<br>
            <span class="console-success">cosmos find-element [--text=string] [--type=button|textfield]</span> - Find UI elements<br>
            <span class="console-success">cosmos interact [--id=elementId] [--action=click|type] [--text=string]</span> - Interact with UI elements<br>
            <span class="console-success">cosmos record-pattern [--name=string] [--description=string]</span> - Record automation pattern<br>
            <span class="console-success">cosmos run-pattern [--id=patternId] [--param.name=value]</span> - Run automation pattern<br>
            <span class="console-success">cosmos system-info</span> - Show system information<br>
            <span class="console-success">cosmos clear</span> - Clear console<br>
            <span class="console-success">cosmos help</span> - Show this help
        `;
    }
    
    // More command response functions...
}
