class WorkflowRecorder {
    constructor() {
        this.isRecording = false;
        this.steps = [];
        this.startTime = null;
        this.stepCounter = 0;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.workflowSteps = document.getElementById('workflowSteps');
        this.workflowSummary = document.getElementById('workflowSummary');
        this.stepCount = document.getElementById('stepCount');
        this.duration = document.getElementById('duration');
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.exportDocBtn = document.getElementById('exportDocBtn');
        
        // Initialize document generator
        this.documentGenerator = new DocumentGenerator();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.clearBtn.addEventListener('click', () => this.clearWorkflow());
        this.exportJsonBtn.addEventListener('click', () => this.exportWorkflowJSON());
        this.exportDocBtn.addEventListener('click', () => this.exportWorkflowDocument());

        // Poll for new actions from content scripts
        this.startActionPolling();

        // Simulate user actions for demo (only when not recording from content scripts)
        document.addEventListener('click', (e) => this.handleUserAction('click', e));
        document.addEventListener('keydown', (e) => this.handleUserAction('keydown', e));
    }

    startRecording() {
        this.isRecording = true;
        this.startTime = Date.now();
        this.stepCounter = 0;
        this.lastActionTimestamp = Date.now(); // Reset timestamp for new recording
        
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.recordingIndicator.classList.add('active');
        
        this.clearEmptyState();
        this.addStep('Start Recording', 'Recording session initiated', '🔴');
        
        // Clear any previous actions and notify service worker
        chrome.storage.local.remove(['workflowActions'], () => {
            chrome.runtime.sendMessage({ type: 'START_RECORDING' });
        });
    }

    stopRecording() {
        this.isRecording = false;
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.recordingIndicator.classList.remove('active');
        
        this.addStep('Stop Recording', 'Recording session completed', '⏹️');
        this.showSummary();
        
        // Notify service worker to stop recording across all tabs
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    }

    clearWorkflow() {
        this.steps = [];
        this.stepCounter = 0;
        this.workflowSteps.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Click "Start Recording" to begin capturing your workflow</p>
            </div>
        `;
        this.workflowSummary.classList.remove('visible');
        
        // Clear stored actions
        chrome.storage.local.remove(['workflowActions']);
    }

    startActionPolling() {
        this.lastActionTimestamp = 0;
        
        // Poll for new actions every 100ms
        setInterval(() => {
            if (this.isRecording) {
                chrome.storage.local.get(['workflowActions'], (result) => {
                    const actions = result.workflowActions || [];
                    
                    // Find new actions since last check
                    const newActions = actions.filter(action => 
                        action.timestamp > this.lastActionTimestamp
                    );
                    
                    // Process new actions
                    newActions.forEach(action => {
                        this.addStep(action.text, action.details, action.icon, action.screenshot);
                        this.lastActionTimestamp = Math.max(this.lastActionTimestamp, action.timestamp);
                    });
                });
            }
        }, 100);
    }

    handleUserAction(type, event) {
        console.log('Handling user action:', type, 'on:', window.location.href);
        if (!this.isRecording || window.location.href.includes('side-panel.html')) return;
        
        // Skip clicks on our own interface
        if (event.target.closest('.container')) return;

        let actionText = '';
        let details = '';
        let icon = '';

        switch(type) {
            case 'click':
                icon = '👆';
                actionText = 'Click';
                
                const element = event.target;
                const tagName = element.tagName.toLowerCase();
                const className = element.className ? `.${element.className.split(' ')[0]}` : '';
                const id = element.id ? `#${element.id}` : '';
                const text = element.textContent ? element.textContent.trim().substring(0, 30) : '';
                
                if (text) {
                    actionText = `Click "${text}"`;
                } else if (id) {
                    actionText = `Click element ${id}`;
                } else if (className) {
                    actionText = `Click element ${className}`;
                }
                
                details = `Element: ${tagName}${id}${className}\nURL: ${window.location.href}`;
                break;
                
            case 'keydown':
                if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control') return;
                
                icon = '⌨️';
                actionText = `Press "${event.key}"`;
                details = `Key: ${event.key}\nTarget: ${event.target.tagName.toLowerCase()}`;
                break;
        }

        this.addStep(actionText, details, icon);
    }

    addStep(action, details, icon = '•', screenshot = null) {
        const timestamp = new Date().toLocaleTimeString();
        
        const step = {
            number: this.steps.length + 1,
            action,
            details,
            icon,
            timestamp,
            screenshot
        };
        
        this.steps.push(step);
        this.renderStep(step);
    }

    renderStep(step) {
        const stepElement = document.createElement('div');
        stepElement.className = 'step-card';
        stepElement.style.animation = 'slideIn 0.3s ease-out';
        
        const screenshotHtml = step.screenshot ? 
            `<div class="step-screenshot">
                <img src="${step.screenshot}" alt="Screenshot" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 8px; cursor: pointer;" onclick="window.open('${step.screenshot}', '_blank')">
            </div>` : '';
        
        const showDeleteButton = step.action !== 'Start Recording' && step.action !== 'Stop Recording';
        const deleteButtonHtml = showDeleteButton ? '<button class="step-delete" title="Delete step">🗑️</button>' : '';
        
        stepElement.innerHTML = `
            <div class="step-header">
                <div class="step-number">${step.number}</div>
                ${deleteButtonHtml}
            </div>
            <div class="step-action">
                <span class="step-icon">${step.icon}</span>
                ${step.action}
            </div>
            <div class="step-details">${step.details}</div>
            ${screenshotHtml}
            <div class="step-timestamp">${step.timestamp}</div>
        `;
        
        // Add event listener for delete button (only if it exists)
        const deleteBtn = stepElement.querySelector('.step-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteStep(step.number));
        }
        
        this.workflowSteps.appendChild(stepElement);
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    clearEmptyState() {
        const emptyState = this.workflowSteps.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    showSummary() {
        const totalDuration = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        
        this.stepCount.textContent = `${this.steps.length} steps`;
        this.duration.textContent = `${totalDuration}s duration`;
        this.workflowSummary.classList.add('visible');
    }

    deleteStep(stepNumber) {
        // Find and remove the step
        const stepIndex = this.steps.findIndex(step => step.number === stepNumber);
        if (stepIndex !== -1) {
            this.steps.splice(stepIndex, 1);
            
            // Renumber all steps after the deleted one
            this.steps.forEach((step, index) => {
                step.number = index + 1;
            });
            
            // Re-render all steps
            this.renderAllSteps();
        }
    }

    renderAllSteps() {
        // Clear existing steps (except empty state)
        const stepCards = this.workflowSteps.querySelectorAll('.step-card');
        stepCards.forEach(card => card.remove());
        
        // Re-render all steps
        this.steps.forEach(step => this.renderStep(step));
        
        // Show empty state if no steps
        if (this.steps.length === 0) {
            this.workflowSteps.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Click "Start Recording" to begin capturing your workflow</p>
                </div>
            `;
        }
    }

        /**
     * Generate workflow data object
     * @returns {Object} Workflow data ready for export
     */
    generateWorkflowData() {
        return {
            title: `Workflow recorded on ${new Date().toLocaleDateString()}`,
            steps: this.steps,
            metadata: {
                recordedAt: new Date().toISOString(),
                duration: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0,
                url: window.location.href
            }
        }
    }

    /**
     * Export workflow as JSON file
     */
    exportWorkflowJSON() {
        const workflow = this.generateWorkflowData();

        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('Exported Workflow JSON:', workflow);
        this.showExportSuccess('JSON file exported successfully!');
    }

    /**
     * Export workflow as Word document
     */
    async exportWorkflowDocument() {
        const workflow = this.generateWorkflowData();
        
        try {
            // Show loading state
            this.showExportProgress('Generating document...');
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `workflow-${timestamp}`;
            
            // Use document generator to create and download document
            await this.documentGenerator.downloadDocument(workflow, filename);
            
            console.log('Exported Workflow Document:', workflow);
            this.showExportSuccess('Word document (.docx) exported successfully!');
        } catch (error) {
            console.error('Error exporting document:', error);
            this.showExportError('Error exporting document. Please try again.');
        }
    }

    /**
     * Show export progress message
     * @param {string} message - Progress message to display
     */
    showExportProgress(message) {
        // Remove any existing notifications
        this.removeNotifications();
        
        const progressDiv = document.createElement('div');
        progressDiv.id = 'export-notification';
        progressDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        progressDiv.innerHTML = `
            <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            ${message}
        `;
        
        this.addNotificationStyles();
        document.body.appendChild(progressDiv);
    }

    /**
     * Show export success message
     * @param {string} message - Success message to display
     */
    showExportSuccess(message) {
        // Remove any existing notifications
        this.removeNotifications();
        
        const successDiv = document.createElement('div');
        successDiv.id = 'export-notification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        successDiv.textContent = message;
        
        this.addNotificationStyles();
        document.body.appendChild(successDiv);
        
        // Remove after 4 seconds
        setTimeout(() => {
            this.removeNotifications();
        }, 4000);
    }

    /**
     * Show export error message
     * @param {string} message - Error message to display
     */
    showExportError(message) {
        // Remove any existing notifications
        this.removeNotifications();
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'export-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        errorDiv.textContent = message;
        
        this.addNotificationStyles();
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            this.removeNotifications();
        }, 5000);
    }

    /**
     * Add notification styles
     */
    addNotificationStyles() {
        if (!document.getElementById('export-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'export-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Remove all notifications
     */
    removeNotifications() {
        const existing = document.getElementById('export-notification');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
    }
}

// Initialize the recorder
const recorder = new WorkflowRecorder();
