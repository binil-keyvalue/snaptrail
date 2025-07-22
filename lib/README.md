# Library Directory Structure

This directory contains all libraries and modules used by the Chrome extension.

## Directory Structure

```
lib/
├── document-export/          # Document generation modules
│   └── document-generator.js # Main document generator class
└── vendor/                   # Third-party libraries
    ├── docx.min.js          # Microsoft Word document generation library
    └── FileSaver.min.js     # File saving utility for browsers
```

## Document Export Module

- **`document-export/document-generator.js`**: Contains the `DocumentGenerator` class that handles professional Word document (.docx) generation using the docx library. Includes features like:
  - Metadata tables with workflow information
  - Step-by-step formatting with icons and timestamps
  - Embedded screenshots with proper sizing
  - Professional styling and page breaks

## Vendor Libraries

- **`vendor/docx.min.js`**: The official docx library for creating Microsoft Word documents programmatically
- **`vendor/FileSaver.min.js`**: Cross-browser file saving utility that handles download functionality

## Usage

These libraries are loaded in the following order in `side-panel.html`:
1. FileSaver.min.js (file saving utility)
2. docx.min.js (document generation)
3. document-generator.js (custom document generator)
4. side-panel.js (main application logic)
