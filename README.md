# Action Recorder Chrome Extension

A Chrome extension that captures user actions with screenshots for test documentation. Perfect for creating step-by-step guides and test cases.

## Features

- **Comprehensive Action Capture**: Records clicks, typing, scrolling, hovering, form submissions, navigation, right-clicks, and drag & drop
- **Screenshot Integration**: Captures full viewport screenshots for each action
- **Right-Side Panel Interface**: Scribe-like panel that doesn't interfere with the target website
- **Real-time Action Display**: See captured actions as screenshots in a vertical list
- **Delete Functionality**: Remove unwanted actions with individual delete buttons
- **Multiple Export Formats**: Export to Excel (.csv) and Word (.doc) formats
- **Step-by-Step Documentation**: Word export creates formatted guides with embedded screenshots

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Action Recorder icon will appear in your Chrome toolbar

## Usage

### Starting a Recording Session

1. Navigate to the website you want to document
2. Click the Action Recorder extension icon in the Chrome toolbar
3. Click "Open Recorder" in the popup
4. The right-side panel will open with a "Start Capture" button
5. Click "Start Capture" to begin recording

### Recording Actions

Once recording starts:
- Perform any actions on the website (clicks, typing, scrolling, etc.)
- Each action will automatically appear as a screenshot in the right panel
- Use the delete (×) button on any screenshot to remove unwanted actions
- The panel shows live updates as you interact with the page

### Stopping and Exporting

1. Click "Stop Capture" when finished
2. The panel will show a summary of captured actions
3. Choose your export format:
   - **Export Excel**: Downloads a CSV file with detailed action data
   - **Export Word**: Downloads a formatted step-by-step guide with screenshots

### Supported Actions

- **Clicks**: Left-clicks on any element
- **Text Input**: Typing in input fields, textareas
- **Scrolling**: Page and element scrolling
- **Hovering**: Mouse hover on interactive elements
- **Right-clicks**: Context menu triggers
- **Form Submissions**: Form submit events
- **Drag & Drop**: Drag and drop operations
- **Navigation**: Page navigation and URL changes

## Export Formats

### Excel Export (.csv)
Contains columns for:
- Step number and timestamp
- Action type and target element details
- CSS selectors and element attributes
- Coordinates and values
- Auto-generated captions

### Word Export (.doc)
Formatted document with:
- Step-by-step instructions
- Embedded screenshots
- Action details and timestamps
- Professional styling for documentation

## Technical Details

### File Structure
```
├── manifest.json          # Extension configuration
├── popup.html/js          # Extension popup interface
├── background.js          # Background script for screenshots
├── content.js            # Main recording logic
├── panel.css             # Panel styling
└── README.md             # Documentation
```

### Permissions Required
- `activeTab`: Access current tab content
- `scripting`: Inject content scripts
- `storage`: Store recording data
- `tabs`: Capture screenshots
- `<all_urls>`: Work on all websites

## Development

### For Hackathon Teams

This extension is designed for rapid development and can be built by a 3-person team in 4 hours:

**Person 1**: Extension infrastructure, content script, action listeners
**Person 2**: Right panel UI, styling, user interactions  
**Person 3**: Data management, export functionality, integration

### Key Components

1. **Content Script** (`content.js`): Handles action detection and recording
2. **Background Script** (`background.js`): Manages screenshot capture
3. **Panel Interface**: Right-side overlay for real-time feedback
4. **Export System**: Converts recorded data to Excel/Word formats

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, etc.)

## Limitations

- Works only on HTTP/HTTPS pages (not chrome:// pages)
- Screenshot quality depends on viewport size
- Large recordings may impact browser performance
- Some dynamic content may not be captured perfectly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across different websites
5. Submit a pull request

## License

MIT License - feel free to use and modify for your projects.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all permissions are granted
3. Test on different websites to isolate issues
4. Report bugs with specific steps to reproduce
