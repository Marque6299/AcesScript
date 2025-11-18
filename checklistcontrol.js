// Update the existing checklistcontroll.js with enhanced functionality
document.addEventListener('DOMContentLoaded', () => {
    const checklistCanvas = document.querySelector('.checklist-canvas');
    const jsonFilePath = 'https://altaces.netlify.app/checklist.json';

    // Fetch the checklist data
    fetch(jsonFilePath)
        .then(response => response.json())
        .then(data => {
            generateChecklistModules(data);
            initializeChecklistNavigation();
        })
        .catch(error => console.error('Failed to load checklist data:', error));

    function generateChecklistModules(checklists) {
        // Clear existing content
        checklistCanvas.innerHTML = '';
        
        // Create modules for each checklist type
        checklists.forEach((checklist, index) => {
            // Only set the first one (Automated Void) as active by default
            const isActive = checklist.id === 'Manual Void';
            
            // Create the module container
            const moduleDiv = document.createElement('div');
            moduleDiv.classList.add('checklist-module');
            if (isActive) moduleDiv.classList.add('active');
            moduleDiv.id = checklist.id;
            
            // Create header with title and reset button
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('table-container');
            if (isActive) headerDiv.classList.add('active');
            
            const headerContent = document.createElement('div');
            headerContent.classList.add('checklist-header');
            
            const title = document.createElement('h3');
            title.textContent = `${checklist.id} Guide`;
            
            const resetButton = document.createElement('button');
            resetButton.classList.add('reset-checklist');
            resetButton.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Reset Checklist';
            resetButton.addEventListener('click', () => resetCheckboxes(moduleDiv));
            
            headerContent.appendChild(title);
            headerContent.appendChild(resetButton);
            headerDiv.appendChild(headerContent);
            moduleDiv.appendChild(headerDiv);
            
            // Create the table
            const table = document.createElement('table');
            table.id = `steps-guide-${checklist.id.replace(/\s+/g, '-').toLowerCase()}`;
            table.classList.add('checklist-table');
            
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const checkboxHeader = document.createElement('th');
            checkboxHeader.classList.add('checkbox-column');
            checkboxHeader.innerHTML = '<i class="fa-solid fa-check-square"></i>';
            
            const stepsHeader = document.createElement('th');
            stepsHeader.textContent = 'Steps';
            
            const amadeusHeader = document.createElement('th');
            // Add Amadeus logo and text
            amadeusHeader.innerHTML = '<img src="https://altaces.netlify.app/amadlogo.png" alt="Amadeus" style="height: 20px; vertical-align: middle; margin-right: 5px;">';
            
            const sabreHeader = document.createElement('th');
            // Add Sabre logo and text
            sabreHeader.innerHTML = '<img src="https://altaces.netlify.app/sabrelogo.png" alt="Sabre" style="height: 20px; vertical-align: middle; margin-right: 5px;">';
            
            headerRow.appendChild(checkboxHeader);
            headerRow.appendChild(stepsHeader);
            headerRow.appendChild(amadeusHeader);
            headerRow.appendChild(sabreHeader);
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            // Sort steps by step number
            const sortedSteps = [...checklist.steps].sort((a, b) => {
                return parseInt(a.stepnumber) - parseInt(b.stepnumber);
            });
            
            // Create rows for each step
            sortedSteps.forEach((step, index) => {
                const row = document.createElement('tr');
                row.dataset.stepNumber = step.stepnumber;
                
                // Add checkbox cell
                const checkboxCell = document.createElement('td');
                checkboxCell.classList.add('checkbox-cell');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('step-checkbox');
                checkbox.dataset.stepIndex = index;
                
                // Removed checkbox restriction - all checkboxes are now enabled
                
                checkbox.addEventListener('change', function() {
                    handleCheckboxChange(this, row);
                });
                checkboxCell.appendChild(checkbox);
                
                // Add title cell with formatted text
                const titleCell = document.createElement('td');
                titleCell.classList.add('step-title');
                
                // Process the title to handle [important:"text"] format
                const formattedTitle = formatStepTitle(step.title);
                titleCell.innerHTML = formattedTitle;
                
                // Make the title cell clickable to toggle checkbox
                titleCell.addEventListener('click', function() {
                    checkbox.checked = !checkbox.checked;
                    handleCheckboxChange(checkbox, row);
                });
                
                // Add Amadeus cell
                const amadeusCell = document.createElement('td');
                amadeusCell.classList.add('amadeus-content');
                if (step.amadeus && step.amadeus.length > 0) {
                    const amadeusContent = document.createElement('div');
                    step.amadeus.forEach(item => {
                        const contentP = document.createElement('p');
                        // Process content to handle Command format
                        if (item.content) {
                            contentP.innerHTML = processCommandText(item.content);
                            // Add copy functionality if it's a command
                            if (item.content.includes('[Command:')) {
                                amadeusCell.classList.add('command-cell');
                                amadeusCell.addEventListener('click', function() {
                                    copyCommandText(item.content);
                                });
                            }
                        }
                        amadeusContent.appendChild(contentP);
                    });
                    amadeusCell.appendChild(amadeusContent);
                }
                
                // Add Sabre cell
                const sabreCell = document.createElement('td');
                sabreCell.classList.add('sabre-content');
                if (step.sabre && step.sabre.length > 0) {
                    const sabreContent = document.createElement('div');
                    step.sabre.forEach(item => {
                        const contentP = document.createElement('p');
                        // Process content to handle Command format
                        if (item.content) {
                            contentP.innerHTML = processCommandText(item.content);
                            // Add copy functionality if it's a command
                            if (item.content.includes('[Command:')) {
                                sabreCell.classList.add('command-cell');
                                sabreCell.addEventListener('click', function() {
                                    copyCommandText(item.content);
                                });
                            }
                        }
                        sabreContent.appendChild(contentP);
                    });
                    sabreCell.appendChild(sabreContent);
                }
                
                // Add all cells to the row
                row.appendChild(checkboxCell);
                row.appendChild(titleCell);
                row.appendChild(amadeusCell);
                row.appendChild(sabreCell);
                
                // Add the row to the table body
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            moduleDiv.appendChild(table);
            checklistCanvas.appendChild(moduleDiv);
        });

        // Add CSS for the command cells and important text
        addCustomStyles();
    }

    // Function to format step title - handle [important:"text"] format
    function formatStepTitle(title) {
        if (!title) return '';
        
        // Check if the title contains the [important:"..."] pattern
        if (title.includes('[important:')) {
            // Replace all [important:"text"] with emphasized version
            return title.replace(/\[important:"([^"]+)"\]/g, (match, importantText) => {
                return `<span class="important-text">${importantText}</span>`;
            });
        }
        
        // Return the title as is if no [important:"..."] tag is found
        return title;
    }

    // Function to handle checkbox change (simplified - no sequential requirement)
    function handleCheckboxChange(checkbox, row) {
        // Just toggle the completed state of the row based on checkbox state
        row.classList.toggle('completed-step', checkbox.checked);
    }

    // Function to process command text
    function processCommandText(text) {
        // First, handle important text
        if (text.includes('[important:')) {
            text = text.replace(/\[important:"([^"]+)"\]/g, (match, importantText) => {
                return `<span class="important-text">${importantText}</span>`;
            });
        }
    
        // Then handle command text
        if (text.includes('[Command:')) {
            const regex = /\[Command:"([^"]+)"\]/g;
            return text.replace(regex, (match, commandText) => {
                return commandText;
            });
        }
        
        return text;
    }

    // Function to copy command text to clipboard
    function copyCommandText(text) {
        // Extract command text from [Command:"text"]
        const regex = /\[Command:"([^"]+)"\]/;
        const match = text.match(regex);
        
        if (match && match[1]) {
            const commandText = match[1];
            navigator.clipboard.writeText(commandText)
                .then(() => {
                    // Show temporary tooltip or feedback
                    showCopyFeedback();
                })
                .catch(err => {
                    console.error('Failed to copy command: ', err);
                });
        }
    }

    // Function to show copy feedback
    function showCopyFeedback() {
        const feedback = document.createElement('div');
        feedback.textContent = 'Command copied!';
        feedback.classList.add('copy-feedback');
        document.body.appendChild(feedback);
        
        // Position feedback near mouse pointer
        document.addEventListener('mousemove', positionFeedback);
        
        function positionFeedback(e) {
            feedback.style.top = (e.clientY + 10) + 'px';
            feedback.style.left = (e.clientX + 10) + 'px';
        }
        
        // Remove feedback after a delay
        setTimeout(() => {
            document.removeEventListener('mousemove', positionFeedback);
            document.body.removeChild(feedback);
        }, 1500);
    }

    // Add CSS styles for command cells and important text
    function addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .command-cell {
                cursor: pointer;
                position: relative;
            }
            .command-cell:hover {
                color:rgb(0, 0, 0);
            }
            .command-cell:active {
                color:rgb(0, 0, 0);
            }
            .copy-feedback {
                position: fixed;
                background-color: rgba(255, 255, 255, 0.8);
                color: rgb(0, 0, 0);
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 1000;
                pointer-events: none;
            }
            tr.completed-step {
                background: rgb(37, 150, 8);
            }
            .step-title {
                cursor: pointer;
            }
            .important-text {
                color: #ff0000;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    function initializeChecklistNavigation() {
        const navButtons = document.querySelectorAll('.listnav-btn');
        
        // Set Automated Void as active by default
        navButtons.forEach(button => {
            button.classList.toggle('active', button.id === 'Manual Void-nav');
        });
        
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                // Get the module ID from the button ID
                const moduleId = button.id.replace('-nav', '');
                updateActiveChecklistModule(moduleId);
            });
        });
    }

    function updateActiveChecklistModule(moduleId) {
        const checklistModules = document.querySelectorAll('.checklist-module');
        checklistModules.forEach(module => {
            module.classList.toggle('active', module.id === moduleId);
            
            // Also toggle active class on the table container
            const tableContainer = module.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.classList.toggle('active', module.id === moduleId);
            }
        });
    }

    function resetCheckboxes(moduleDiv) {
        const checkboxes = moduleDiv.querySelectorAll('.step-checkbox');
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
            
            const row = checkbox.closest('tr');
            row.classList.remove('completed-step');
        });
    }
});
