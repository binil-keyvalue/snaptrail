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
        this.exportBtn = document.getElementById('exportBtn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.clearBtn.addEventListener('click', () => this.clearWorkflow());
        this.exportBtn.addEventListener('click', () => this.exportWorkflow());

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
                        this.addStep(action.text, action.details, action.icon);
                        this.lastActionTimestamp = Math.max(this.lastActionTimestamp, action.timestamp);
                    });
                });
            }
        }, 100);
    }

    handleUserAction(type, event) {
        if (!this.isRecording) return;
        
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

    addStep(action, details, icon = '•') {
        this.stepCounter++;
        const timestamp = new Date().toLocaleTimeString();
        
        const step = {
            number: this.stepCounter,
            action,
            details,
            icon,
            timestamp
        };
        
        this.steps.push(step);
        this.renderStep(step);
    }

    renderStep(step) {
        const stepElement = document.createElement('div');
        stepElement.className = 'step-card';
        stepElement.style.animation = 'slideIn 0.3s ease-out';
        
        stepElement.innerHTML = `
            <div class="step-number">${step.number}</div>
            <div class="step-action">
                <span class="step-icon">${step.icon}</span>
                ${step.action}
            </div>
            <div class="step-details">${step.details}</div>
            <div class="step-timestamp">${step.timestamp}</div>
        `;
        
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

    exportWorkflow() {
        const workflow = {
            title: `Workflow recorded on ${new Date().toLocaleDateString()}`,
            steps: this.steps,
            metadata: {
                recordedAt: new Date().toISOString(),
                duration: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0,
                url: window.location.href
            }
        };

        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Also log to console for demo
        console.log('Exported Workflow:', workflow);
        alert('Workflow exported successfully!');
    }
}

// Initialize the recorder
const recorder = new WorkflowRecorder();
