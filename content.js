// Content script for action recording
class ActionRecorder {
  constructor() {
    this.isRecording = false;
    this.actions = [];
    this.stepCounter = 0;
    this.panel = null;
    this.isPanelOpen = false;
    
    this.init();
  }

  init() {
    this.createPanel();
    this.setupMessageListener();
  }

  createPanel() {
    // Create panel container
    this.panel = document.createElement('div');
    this.panel.id = 'action-recorder-panel';
    this.panel.innerHTML = `
      <div class="resize-indicator"></div>
      <div class="panel-header">
        <h3>Action Recorder</h3>
        <button id="close-panel" class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="controls">
          <button id="start-recording" class="btn btn-primary">Start Capture</button>
          <button id="stop-recording" class="btn btn-secondary" style="display: none;">Stop Capture</button>
        </div>
        <div class="recording-status" style="display: none;">
          <div class="status-indicator"></div>
          <span>Recording...</span>
        </div>
        <div class="actions-container">
          <div class="actions-list" id="actions-list"></div>
        </div>
        <div class="export-section" id="export-section" style="display: none;">
          <div class="summary" id="summary"></div>
          <div class="export-buttons">
            <button id="export-excel" class="btn btn-export">Export Excel</button>
            <button id="export-word" class="btn btn-export">Export Word</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);
    this.setupPanelEvents();
    this.setupResizeObserver();
  }

  setupPanelEvents() {
    // Close panel
    document.getElementById('close-panel').addEventListener('click', () => {
      this.hidePanel();
    });

    // Start recording
    document.getElementById('start-recording').addEventListener('click', () => {
      this.startRecording();
    });

    // Stop recording
    document.getElementById('stop-recording').addEventListener('click', () => {
      this.stopRecording();
    });

    // Export buttons
    document.getElementById('export-excel').addEventListener('click', () => {
      this.exportToExcel();
    });

    document.getElementById('export-word').addEventListener('click', () => {
      this.exportToWord();
    });
  }

  setupResizeObserver() {
    // Observe panel width changes and update body margin accordingly
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (this.isPanelOpen) {
            const panelWidth = entry.contentRect.width;
            document.body.style.marginRight = `${panelWidth}px`;
          }
        }
      });
      
      this.resizeObserver.observe(this.panel);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'togglePanel':
          this.togglePanel();
          sendResponse({isOpen: this.isPanelOpen});
          break;
        case 'openPanel':
          if (!this.isPanelOpen) {
            this.showPanel();
          }
          sendResponse({isOpen: this.isPanelOpen});
          break;
        case 'checkPanelState':
          sendResponse({isOpen: this.isPanelOpen, isRecording: this.isRecording});
          break;
      }
    });
  }

  togglePanel() {
    if (this.isPanelOpen) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    this.panel.style.display = 'flex';
    this.panel.classList.add('opening');
    this.isPanelOpen = true;
    
    // Use current panel width or default to 350px
    const panelWidth = this.panel.offsetWidth || 350;
    document.body.style.marginRight = `${panelWidth}px`;
    document.body.style.transition = 'margin-right 0.3s ease';
  }

  hidePanel() {
    this.panel.style.display = 'none';
    this.panel.classList.remove('opening');
    this.isPanelOpen = false;
    document.body.style.marginRight = '0';
    
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  startRecording() {
    this.isRecording = true;
    this.actions = [];
    this.stepCounter = 0;
    
    // Update UI
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'block';
    document.querySelector('.recording-status').style.display = 'flex';
    document.getElementById('export-section').style.display = 'none';
    document.getElementById('actions-list').innerHTML = '';

    // Add event listeners
    this.addEventListeners();
  }

  stopRecording() {
    this.isRecording = false;
    
    // Update UI
    document.getElementById('start-recording').style.display = 'block';
    document.getElementById('stop-recording').style.display = 'none';
    document.querySelector('.recording-status').style.display = 'none';
    
    // Show export section
    this.showExportSection();
    
    // Remove event listeners
    this.removeEventListeners();
  }

  addEventListeners() {
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('scroll', this.handleScroll.bind(this), true);
    document.addEventListener('mouseover', this.handleHover.bind(this), true);
    document.addEventListener('contextmenu', this.handleRightClick.bind(this), true);
    document.addEventListener('dragstart', this.handleDragStart.bind(this), true);
    document.addEventListener('drop', this.handleDrop.bind(this), true);
    document.addEventListener('submit', this.handleSubmit.bind(this), true);
  }

  removeEventListeners() {
    document.removeEventListener('click', this.handleClick.bind(this), true);
    document.removeEventListener('input', this.handleInput.bind(this), true);
    document.removeEventListener('scroll', this.handleScroll.bind(this), true);
    document.removeEventListener('mouseover', this.handleHover.bind(this), true);
    document.removeEventListener('contextmenu', this.handleRightClick.bind(this), true);
    document.removeEventListener('dragstart', this.handleDragStart.bind(this), true);
    document.removeEventListener('drop', this.handleDrop.bind(this), true);
    document.removeEventListener('submit', this.handleSubmit.bind(this), true);
  }

  handleClick(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'click',
      element: this.getElementInfo(event.target),
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: new Date().toISOString()
    });
  }

  handleInput(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'input',
      element: this.getElementInfo(event.target),
      value: event.target.value,
      inputType: event.target.type,
      timestamp: new Date().toISOString()
    });
  }

  handleScroll(event) {
    if (!this.isRecording) return;
    
    // Throttle scroll events
    if (this.scrollTimeout) return;
    this.scrollTimeout = setTimeout(() => {
      this.scrollTimeout = null;
      this.captureAction({
        type: 'scroll',
        element: event.target === document ? 'window' : this.getElementInfo(event.target),
        scrollPosition: {
          x: window.scrollX || event.target.scrollLeft,
          y: window.scrollY || event.target.scrollTop
        },
        timestamp: new Date().toISOString()
      });
    }, 500);
  }

  handleHover(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    // Only capture hover on interactive elements
    const interactiveElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (interactiveElements.includes(event.target.tagName)) {
      this.captureAction({
        type: 'hover',
        element: this.getElementInfo(event.target),
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRightClick(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'rightclick',
      element: this.getElementInfo(event.target),
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: new Date().toISOString()
    });
  }

  handleDragStart(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'dragstart',
      element: this.getElementInfo(event.target),
      timestamp: new Date().toISOString()
    });
  }

  handleDrop(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'drop',
      element: this.getElementInfo(event.target),
      timestamp: new Date().toISOString()
    });
  }

  handleSubmit(event) {
    if (!this.isRecording || this.isRecorderElement(event.target)) return;
    
    this.captureAction({
      type: 'submit',
      element: this.getElementInfo(event.target),
      timestamp: new Date().toISOString()
    });
  }

  isRecorderElement(element) {
    return element.closest('#action-recorder-panel') !== null;
  }

  getElementInfo(element) {
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent ? element.textContent.substring(0, 100) : '',
      selector: this.generateSelector(element),
      attributes: this.getRelevantAttributes(element)
    };
  }

  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += '.' + element.className.split(' ').join('.');
    }
    
    return selector;
  }

  getRelevantAttributes(element) {
    const relevantAttrs = ['type', 'name', 'placeholder', 'value', 'href', 'src'];
    const attrs = {};
    
    relevantAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        attrs[attr] = element.getAttribute(attr);
      }
    });
    
    return attrs;
  }

  captureAction(actionData) {
    // Capture screenshot
    chrome.runtime.sendMessage({action: 'captureScreenshot'}, (response) => {
      if (response && response.success) {
        this.stepCounter++;
        const action = {
          step: this.stepCounter,
          ...actionData,
          screenshot: response.screenshot,
          caption: this.generateCaption(actionData)
        };
        
        this.actions.push(action);
        this.addActionToUI(action);
      }
    });
  }

  generateCaption(actionData) {
    switch (actionData.type) {
      case 'click':
        return `Click on ${actionData.element.tagName.toLowerCase()}${actionData.element.textContent ? ': ' + actionData.element.textContent.substring(0, 50) : ''}`;
      case 'input':
        return `Type "${actionData.value}" in ${actionData.element.tagName.toLowerCase()}`;
      case 'scroll':
        return `Scroll to position (${actionData.scrollPosition.x}, ${actionData.scrollPosition.y})`;
      case 'hover':
        return `Hover over ${actionData.element.tagName.toLowerCase()}`;
      case 'rightclick':
        return `Right-click on ${actionData.element.tagName.toLowerCase()}`;
      case 'submit':
        return `Submit form`;
      default:
        return `${actionData.type} action`;
    }
  }

  addActionToUI(action) {
    const actionsList = document.getElementById('actions-list');
    const actionElement = document.createElement('div');
    actionElement.className = 'action-item';
    actionElement.innerHTML = `
      <div class="action-screenshot">
        <img src="${action.screenshot}" alt="Step ${action.step}" />
        <button class="delete-action" data-step="${action.step}">×</button>
      </div>
    `;
    
    actionsList.appendChild(actionElement);
    
    // Add delete functionality
    actionElement.querySelector('.delete-action').addEventListener('click', () => {
      this.deleteAction(action.step, actionElement);
    });
    
    // Scroll to bottom
    actionsList.scrollTop = actionsList.scrollHeight;
  }

  deleteAction(step, element) {
    // Remove from actions array
    this.actions = this.actions.filter(action => action.step !== step);
    
    // Remove from UI
    element.remove();
  }

  showExportSection() {
    const exportSection = document.getElementById('export-section');
    const summary = document.getElementById('summary');
    
    summary.textContent = `${this.actions.length} actions captured`;
    exportSection.style.display = 'block';
  }

  exportToExcel() {
    const data = this.prepareExportData();
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-recording-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  exportToWord() {
    const data = this.prepareWordExportData();
    const html = this.convertToWordHTML(data);
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-recording-${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  prepareExportData() {
    return this.actions.map(action => ({
      'Step': action.step,
      'Timestamp': action.timestamp,
      'Action Type': action.type,
      'Element': action.element.tagName,
      'Element ID': action.element.id,
      'Element Class': action.element.className,
      'Element Text': action.element.textContent,
      'CSS Selector': action.element.selector,
      'Value': action.value || '',
      'Coordinates': action.coordinates ? `(${action.coordinates.x}, ${action.coordinates.y})` : '',
      'Caption': action.caption
    }));
  }

  prepareWordExportData() {
    return this.actions.map(action => ({
      step: action.step,
      caption: action.caption,
      screenshot: action.screenshot,
      details: {
        type: action.type,
        element: action.element.tagName,
        selector: action.element.selector,
        timestamp: new Date(action.timestamp).toLocaleString()
      }
    }));
  }

  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  convertToWordHTML(data) {
    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Action Recording - Step by Step Guide</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #4285f4; }
            .step { margin: 20px 0; page-break-inside: avoid; }
            .step-header { font-weight: bold; color: #4285f4; margin-bottom: 10px; }
            .step-image { max-width: 100%; height: auto; border: 1px solid #ddd; margin: 10px 0; }
            .step-details { font-size: 12px; color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Action Recording - Step by Step Guide</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Steps: ${data.length}</p>
    `;
    
    data.forEach(action => {
      html += `
        <div class="step">
          <div class="step-header">Step ${action.step}: ${action.caption}</div>
          <img src="${action.screenshot}" class="step-image" alt="Step ${action.step}" />
          <div class="step-details">
            <strong>Action:</strong> ${action.details.type}<br>
            <strong>Element:</strong> ${action.details.element}<br>
            <strong>Selector:</strong> ${action.details.selector}<br>
            <strong>Time:</strong> ${action.details.timestamp}
          </div>
        </div>
      `;
    });
    
    html += `
        </body>
      </html>
    `;
    
    return html;
  }
}

// Prevent multiple instances
if (window.actionRecorderInstance) {
  console.log('Action Recorder already initialized');
} else {
  // Initialize the recorder
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.actionRecorderInstance = new ActionRecorder();
    });
  } else {
    window.actionRecorderInstance = new ActionRecorder();
  }
}
