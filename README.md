# Workflow Recorder Chrome Extension

A Chrome extension that captures user actions with screenshots and exports them as documentation in JSON or Word document format.

## Features

- **Action Recording**: Automatically captures clicks, typing, scrolling, and other user interactions
- **Screenshot Capture**: Takes screenshots of the entire viewport for each action
- **Dual Export Options**: 
  - JSON export for technical documentation
  - Word document export for readable step-by-step guides
- **Real-time Preview**: View captured actions in the side panel as they happen
- **Professional Formatting**: Word documents include metadata, timestamps, and embedded screenshots

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## Usage

1. **Start Recording**: Click the extension icon to open the side panel, then click "Start Recording"
2. **Perform Actions**: Navigate and interact with any website - actions will be automatically captured
3. **Stop Recording**: Click "Stop Recording" when finished
4. **Export Documentation**: Choose between:
   - **Export JSON**: Technical format with all action details
   - **Export Document**: Professional Word document with formatted steps and screenshots

## Export Formats

### JSON Export
Contains complete technical details including:
- Action types and timestamps
- Element selectors and details
- Screenshot data (base64)
- Metadata (duration, URL, recording time)

### Document Export
Professional Word-compatible document featuring:
- Document header with recording metadata
- Step-by-step workflow with icons and descriptions
- Embedded screenshots (automatically resized)
- Professional formatting suitable for documentation

## File Structure

- `manifest.json` - Extension configuration
- `side-panel.html` - Main UI interface
- `side-panel.js` - Core recording functionality
- `document-generator.js` - Word document generation
- `content-script.js` - Page interaction capture
- `service-worker.js` - Background processes

## Technical Details

- Uses Chrome Extension Manifest V3
- CSP-compliant document generation (no external CDNs)
- HTML-based Word document creation for maximum compatibility
- Real-time action polling and screenshot capture
- Professional document formatting with Microsoft Office namespaces
