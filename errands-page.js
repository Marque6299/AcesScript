document.addEventListener('DOMContentLoaded', function () {
    // Initialize local storage and set up listeners
    if (!localStorage.getItem('archivedErrands')) {
        localStorage.setItem('archivedErrands', JSON.stringify([]));
    }
    updateArchiveDisplay();
    setupFormListeners();
    createDialogElements();
    autoDeleteOldArchives();

    setInterval(autoDeleteOldArchives, 300000);

    // Collapse/Expand form area on heading click
    document.querySelectorAll('.customer-heading').forEach(heading => {
        heading.addEventListener('click', () => {
            const formArea = heading.nextElementSibling;
            const notesTextarea = heading.closest('.form-container').querySelector('textarea');
            if (formArea) {
                formArea.classList.toggle('collapsed');
                adjustTextareaHeight();
            }
        });
    });

    // Add CSS for collapsed state
    const style = document.createElement('style');
    style.innerHTML = `
        .collapsed { display: none; }
        
        /* Custom Dialog Styles */
        .custom-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }
        
        .custom-dialog-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        .custom-dialog {
            background-color: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            width: 90%;
            max-width: 400px;
            overflow: hidden;
            transform: translateY(-20px);
            transition: transform 0.3s;
        }
        
        .custom-dialog-overlay.active .custom-dialog {
            transform: translateY(0);
        }
        
        .custom-dialog-header {
            background: linear-gradient(to right, #2980b9, #2d6a4f);
            color: white;
            padding: 15px 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .custom-dialog-header i {
            margin-right: 10px;
        }
        
        .custom-dialog-close {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
        }
        
        .custom-dialog-body {
            padding: 20px;
            color: #343a40;
        }
        
        .custom-dialog-footer {
            display: flex;
            justify-content: flex-end;
            padding: 10px 20px 20px;
            gap: 10px;
        }
        
        .custom-dialog-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .custom-dialog-btn-primary {
            background: #2d6a4f;
            color: white;
        }
        
        .custom-dialog-btn-secondary {
            background: #e0e0e0;
            color: #343a40;
        }
        
        .custom-dialog-btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .custom-dialog-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Toast notification styles */
        .toast-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2d6a4f;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            z-index: 1001;
            transform: translateY(100px);
            opacity: 0;
            transition: transform 0.3s, opacity 0.3s;
        }
        
        .toast-notification.active {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-notification i {
            margin-right: 10px;
            font-size: 18px;
        }
        
    `;
    document.head.appendChild(style);

    // Adjust textarea height based on form collapse state
    function adjustTextareaHeight() {
        document.querySelectorAll('textarea').forEach(textarea => {
            const formArea = textarea.closest('.form-container').querySelector('.form-area');
            if (formArea && formArea.classList.contains('collapsed')) {
                textarea.style.height = '400px'; // Expand when form is collapsed
            } else {
                textarea.style.height = '100px'; // Default height
            }
        });
    }

    function autoDeleteOldArchives() {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        const now = new Date().getTime();

        const filteredErrands = archivedErrands.filter(errand => {
            const archivedTime = new Date(errand.archivedDate).getTime();
            return now - archivedTime <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        });

        if (filteredErrands.length !== archivedErrands.length) {
            localStorage.setItem('archivedErrands', JSON.stringify(filteredErrands));
            updateArchiveDisplay();
            console.log('✅ Archived errands older than 24 hours have been deleted.');
        }
    }

    // Update heading text when customer name input changes
    document.querySelectorAll("[id^='input-cxname-']").forEach(input => {
        input.addEventListener("input", () => {
            const formContainer = input.closest(".form-container");
            const heading = formContainer.querySelector("h2");
            heading.textContent = input.value.trim() || heading.dataset.originalText || heading.textContent;
        });
    });

    // Set up listeners for copy, clear, and archive buttons
    function setupFormListeners() {
        document.querySelectorAll('.form-container').forEach((form, index) => {
            const formIndex = index + 1;

            // Clear button
            form.querySelector('.clear-button').addEventListener('click', () => {
                showConfirmDialog(
                    'Clear Form',
                    'Are you sure you want to clear all fields in this form?',
                    'fa-trash',
                    () => clearForm(formIndex)
                );
            });

            // Copy button
            form.querySelector('.copy-button').addEventListener('click', () => {
                copyFormData(formIndex);
            });

            // Archive button
            form.querySelector('.archive-button').addEventListener('click', () => {
                archiveFormData(formIndex);
            });
        });

        // Clear Archive button
        const clearArchiveBtn = document.getElementById('clear-archive-btn');
        if (clearArchiveBtn) {
            clearArchiveBtn.addEventListener('click', () => {
                showConfirmDialog(
                    'Clear Archive',
                    'Are you sure you want to clear all archived errands? This action cannot be undone.',
                    'fa-trash-can',
                    clearArchive
                );
            });
        }
        
        // Add new buttons to archive header
        addArchiveActionButtons();
    }
    
    // Add Excel download and Copy All buttons to archive header
    function addArchiveActionButtons() {
        const archiveHeader = document.querySelector('.archive-actions');
        if (!archiveHeader) return;
        
        // Get references to existing buttons instead of creating new ones
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        const copyAllBtn = document.getElementById('copy-all-btn');
        
        // Add event listeners to the existing buttons
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', downloadArchivedAsExcel);
        }
        
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', copyAllArchived);
        }
        
    }

    // Create dialog elements
    function createDialogElements() {
        // Create alert dialog
        const alertDialog = document.createElement('div');
        alertDialog.className = 'custom-dialog-overlay';
        alertDialog.id = 'alert-dialog';
        alertDialog.innerHTML = `
            <div class="custom-dialog">
                <div class="custom-dialog-header">
                    <span><i class="fa-solid fa-circle-exclamation"></i> <span id="alert-title">Alert</span></span>
                    <button class="custom-dialog-close">&times;</button>
                </div>
                <div class="custom-dialog-body">
                    <p id="alert-message">Alert message goes here.</p>
                </div>
                <div class="custom-dialog-footer">
                    <button id="alert-ok" class="custom-dialog-btn custom-dialog-btn-primary">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(alertDialog);

        // Create confirm dialog
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'custom-dialog-overlay';
        confirmDialog.id = 'confirm-dialog';
        confirmDialog.innerHTML = `
            <div class="custom-dialog">
                <div class="custom-dialog-header">
                    <span><i id="confirm-icon" class="fa-solid fa-question-circle"></i> <span id="confirm-title">Confirm</span></span>
                    <button class="custom-dialog-close">&times;</button>
                </div>
                <div class="custom-dialog-body">
                    <p id="confirm-message">Confirm message goes here.</p>
                </div>
                <div class="custom-dialog-footer">
                    <button id="confirm-cancel" class="custom-dialog-btn custom-dialog-btn-secondary">No</button>
                    <button id="confirm-ok" class="custom-dialog-btn custom-dialog-btn-danger">Yes</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmDialog);

        // Create toast notification
        const toastNotification = document.createElement('div');
        toastNotification.className = 'toast-notification';
        toastNotification.id = 'toast-notification';
        toastNotification.innerHTML = `
            <i id="toast-icon" class="fa-solid fa-check-circle"></i>
            <span id="toast-message">Notification message</span>
        `;
        document.body.appendChild(toastNotification);

        // Set up dialog event listeners
        document.querySelectorAll('.custom-dialog-close').forEach(button => {
            button.addEventListener('click', () => {
                closeAllDialogs();
            });
        });

        document.getElementById('alert-ok').addEventListener('click', () => {
            closeAllDialogs();
        });

        document.getElementById('confirm-cancel').addEventListener('click', () => {
            closeAllDialogs();
        });
    }

    // Show alert dialog
    function showAlertDialog(title, message, icon = 'fa-circle-exclamation', callback = null) {
        const dialog = document.getElementById('alert-dialog');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const iconElement = dialog.querySelector('.custom-dialog-header i');
        const okButton = document.getElementById('alert-ok');

        titleElement.textContent = title;
        messageElement.textContent = message;
        iconElement.className = `fa-solid ${icon}`;
        
        if (callback) {
            okButton.onclick = () => {
                closeAllDialogs();
                callback();
            };
        } else {
            okButton.onclick = closeAllDialogs;
        }

        dialog.classList.add('active');
    }

    // Show confirm dialog
    function showConfirmDialog(title, message, icon = 'fa-question-circle', confirmCallback) {
        const dialog = document.getElementById('confirm-dialog');
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const iconElement = document.getElementById('confirm-icon');
        const confirmButton = document.getElementById('confirm-ok');

        titleElement.textContent = title;
        messageElement.textContent = message;
        iconElement.className = `fa-solid ${icon}`;
        
        confirmButton.onclick = () => {
            closeAllDialogs();
            if (confirmCallback) confirmCallback();
        };

        dialog.classList.add('active');
    }

    // Show toast notification
    function showToast(message, icon = 'fa-check-circle', duration = 3000) {
        const toast = document.getElementById('toast-notification');
        const messageElement = document.getElementById('toast-message');
        const iconElement = document.getElementById('toast-icon');

        messageElement.textContent = message;
        iconElement.className = `fa-solid ${icon}`;

        toast.classList.add('active');
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, duration);
    }

    // Close all dialogs
    function closeAllDialogs() {
        document.querySelectorAll('.custom-dialog-overlay').forEach(dialog => {
            dialog.classList.remove('active');
        });
    }

    // Clear form fields with visual feedback
    function clearForm(formIndex) {
        const form = document.querySelector(`.form-container:nth-child(${formIndex})`);
        form.querySelectorAll('input, textarea').forEach(input => input.value = '');
        
        const heading = form.querySelector('.customer-heading');
        heading.textContent = heading.dataset.originalText || `Customer ${formIndex}`;
        
        showToast('Form has been cleared', 'fa-trash', 2000);
    }

    // Copy form data with visual feedback
    function copyFormData(formIndex) {
        const form = document.querySelector(`.form-container:nth-child(${formIndex})`);
        let copiedData = '';
    
        // Copy text inputs (excluding Edwin Order#)
        form.querySelectorAll("input[type='text']").forEach(input => {
            // Skip the Edwin Order# field
            if (input.id !== `input-edwin-id-${formIndex}` && input.value.trim()) {
                const label = form.querySelector(`label[for='${input.id}']`).textContent.trim();
                copiedData += `${label}: ${input.value}\n`;
            }
        });
    
        // Copy notes textarea
        const notesTextarea = form.querySelector('textarea[name="notes"]');
        if (notesTextarea && notesTextarea.value.trim()) {
            copiedData += `Notes:\n--${notesTextarea.value.trim()}\n`;
        }
    
        if (copiedData) {
            navigator.clipboard.writeText(copiedData).then(() => {
                showToast('Data copied to clipboard!', 'fa-copy', 2000);
            }).catch(() => {
                showAlertDialog('Copy Failed', 'Failed to copy data to clipboard.', 'fa-exclamation-triangle');
            });
        } else {
            showAlertDialog('Nothing to Copy', 'There is no data to copy. Please fill in some fields first.', 'fa-info-circle');
        }
    }

    // Archive form data
    function archiveFormData(formIndex) {
        const form = document.querySelector(`.form-container:nth-child(${formIndex})`);
        const formData = {
            edwinId: document.getElementById(`input-edwin-id-${formIndex}`).value,
            interactionId: document.getElementById(`input-interaction-id-${formIndex}`).value,
            customerName: document.getElementById(`input-cxname-${formIndex}`).value,
            dpa: document.getElementById(`input-dpa-${formIndex}`).value,
            relationship: document.getElementById(`input-relationship-${formIndex}`).value,
            query: document.getElementById(`input-query-${formIndex}`).value,
            resolution: document.getElementById(`input-resolution-${formIndex}`).value,
            yyrl: document.getElementById(`input-yyrl-${formIndex}`).value,
            ghostline: document.getElementById(`input-ghostline-${formIndex}`).value,
            validator: document.getElementById(`input-validator-${formIndex}`).value,
            notes: document.getElementById(`notes-${formIndex}`).value,
            archivedDate: new Date().toLocaleString()
        };

        if (!formData.interactionId || !formData.customerName) {
            showAlertDialog('Required Fields Missing', 'Please fill in Interaction ID and Customer Name before archiving.', 'fa-exclamation-triangle');
            return;
        }

        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        archivedErrands.push(formData);
        localStorage.setItem('archivedErrands', JSON.stringify(archivedErrands));
        updateArchiveDisplay();
        clearForm(formIndex);
        showToast('Errand successfully archived!', 'fa-box-archive', 3000);
    }

    // Restore archived item
    function restoreArchivedItem(index) {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        if (index >= 0 && index < archivedErrands.length) {
            const errand = archivedErrands[index];
            let targetFormIndex = document.getElementById('input-edwin-id-1').value ? 2 : 1;
            const form = document.querySelector(`.form-container:nth-child(${targetFormIndex})`);

            Object.keys(errand).forEach(key => {
                const input = form.querySelector(`[id^='input-${key}-${targetFormIndex}']`);
                if (input) input.value = errand[key];
            });

            document.getElementById(`input-edwin-id-${targetFormIndex}`).value = errand.edwinId;
            document.getElementById(`input-interaction-id-${targetFormIndex}`).value = errand.interactionId;
            document.getElementById(`input-cxname-${targetFormIndex}`).value = errand.customerName;
            document.getElementById(`notes-${targetFormIndex}`).value = errand.notes || '';

            // Update customer heading with restored customer name
            const heading = form.querySelector('.customer-heading');
            heading.textContent = errand.customerName || heading.dataset.originalText || `Customer ${targetFormIndex}`;

            showConfirmDialog(
                'Remove from Archive?',
                `Errand has been restored to Form ${targetFormIndex}. Would you like to remove it from the archive?`,
                'fa-question-circle',
                () => deleteArchivedItem(index)
            );
        }
    }

    // Delete archived item
    function deleteArchivedItem(index) {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        if (index >= 0 && index < archivedErrands.length) {
            archivedErrands.splice(index, 1);
            localStorage.setItem('archivedErrands', JSON.stringify(archivedErrands));
            updateArchiveDisplay();
            showToast('Errand removed from archive', 'fa-trash-alt', 2000);
        }
    }

    // Clear all archived errands
    function clearArchive() {
        localStorage.setItem('archivedErrands', JSON.stringify([]));
        updateArchiveDisplay();
        showToast('All archived errands have been cleared', 'fa-trash-can', 3000);
    }
    
    // Download archived errands as Excel file
    function downloadArchivedAsExcel() {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        
        if (archivedErrands.length === 0) {
            showAlertDialog('No Data', 'There are no archived errands to download.', 'fa-info-circle');
            return;
        }
        
        // Create CSV content
        let csvContent = 'Interaction ID,Archived Date,Customer Name,DPA,Relationship,Query,Resolution,YY RL/Ticket,Ghostline,Validated By,Notes\n';
        
        archivedErrands.forEach(errand => {
            // Properly escape fields that might contain commas
            const escapeCsvField = (field) => {
                if (field === undefined || field === null) return '';
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            
            csvContent += [
                escapeCsvField(errand.edwinId),
                escapeCsvField(errand.interactionId),
                escapeCsvField(errand.archivedDate),
                escapeCsvField(errand.customerName),
                escapeCsvField(errand.dpa),
                escapeCsvField(errand.relationship),
                escapeCsvField(errand.query),
                escapeCsvField(errand.resolution),
                escapeCsvField(errand.yyrl),
                escapeCsvField(errand.ghostline),
                escapeCsvField(errand.validator),
                escapeCsvField(errand.notes)
            ].join(',') + '\n';
        });
        
        // Create a blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `archived_errands_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Excel file downloaded successfully!', 'fa-file-excel', 3000);
    }
    
    // Copy all archived errands to clipboard
    function copyAllArchived() {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        
        if (archivedErrands.length === 0) {
            showAlertDialog('No Data', 'There are no archived errands to copy.', 'fa-info-circle');
            return;
        }
        
        let clipboardText = '';
        
        archivedErrands.forEach((errand, index) => {
            if (index > 0) {
                clipboardText += '\n' + '*-'.repeat(20) +'*'+ '\n\n';
            }
            clipboardText += `Edwin Order#:\n${errand.edwinId || 'N/A'}\n`;
            clipboardText += `Interaction ID:\n${errand.interactionId || 'N/A'}\n`;
            clipboardText += `Customer Name: ${errand.customerName || 'N/A'}\n`;
            clipboardText += `DPA: ${errand.dpa || 'N/A'}\n`;
            clipboardText += `Relationship: ${errand.relationship || 'N/A'}\n`;
            clipboardText += `Query: ${errand.query || 'N/A'}\n`;
            clipboardText += `Resolution: ${errand.resolution || 'N/A'}\n`;
            clipboardText += `YY RL/Ticket No.: ${errand.yyrl || 'N/A'}\n`;
            clipboardText += `Ghostline: ${errand.ghostline || 'N/A'}\n`;
            clipboardText += `Validated by: ${errand.validator || 'N/A'}\n`;
            
            if (errand.notes && errand.notes.trim() !== '') {
                clipboardText += `Notes:\n-- ${errand.notes}\n\n`;
            }
            
            clipboardText += `Archived: ${errand.archivedDate}\n`;
        });
        
        navigator.clipboard.writeText(clipboardText).then(() => {
            showToast(`Copied ${archivedErrands.length} archived errands to clipboard`, 'fa-copy', 3000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showAlertDialog('Copy Failed', 'Failed to copy to clipboard. The data may be too large.', 'fa-exclamation-triangle');
        });
    }

    // Before unload warning
    window.addEventListener('beforeunload', function (event) {
        // Check if there's any unsaved data
        let hasUnsavedData = false;
        document.querySelectorAll('.form-container').forEach(form => {
            form.querySelectorAll('input, textarea').forEach(input => {
                if (input.value.trim()) {
                    hasUnsavedData = true;
                }
            });
        });

        if (hasUnsavedData) {
            const message = 'Are you sure you want to leave? Your changes may not be saved.';
            event.returnValue = message;
            return message;
        }
    });

    // Update archive display
    function updateArchiveDisplay() {
        const archivedErrands = JSON.parse(localStorage.getItem('archivedErrands')) || [];
        const tableBody = document.getElementById('archived-errands-body');
        const noArchivesMessage = document.getElementById('no-archives-message');
        tableBody.innerHTML = '';

        if (archivedErrands.length === 0) {
            noArchivesMessage.style.display = 'block';
        } else {
            noArchivesMessage.style.display = 'none';
            archivedErrands.forEach((errand, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${errand.edwinId}</td>
                    <td>${errand.interactionId}</td>
                    <td>${errand.customerName}</td>
                    <td>${errand.dpa || 'N/A'}</td>
                    <td>${errand.relationship || 'N/A'}</td>
                    <td>${errand.query || 'N/A'}</td>
                    <td>${errand.resolution || 'N/A'}</td>
                    <td>${errand.yyrl || 'N/A'}</td>
                    <td>${errand.ghostline || 'N/A'}</td>
                    <td>${errand.validator || 'N/A'}</td>
                    <td>${errand.notes || 'N/A'}</td>
                    <td>${errand.archivedDate}</td>
                    <td>
                        <button class="restore-btn" data-index="${index}">Restore</button>
                        <button class="delete-btn" data-index="${index}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            document.querySelectorAll('.restore-btn').forEach(button => {
                button.addEventListener('click', () => restoreArchivedItem(parseInt(button.dataset.index)));
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const index = parseInt(button.dataset.index);
                    showConfirmDialog(
                        'Delete Errand',
                        'Are you sure you want to delete this errand from the archive?',
                        'fa-trash-alt',
                        () => deleteArchivedItem(index)
                    );
                });
            });
        }
    }
});
