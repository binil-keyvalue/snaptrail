/**
 * Document Generator for Workflow Recorder
 * Uses docx library for professional Word document generation
 */

class DocumentGenerator {
    constructor() {
        this.fileExtension = '.docx';
        // Check if docx library is available
        if (typeof docx === 'undefined') {
            console.error('docx library not loaded. Make sure to include docx.min.js');
        }
    }

    /**
     * Generate a Word document from workflow JSON using docx library
     * @param {Object} workflowData - The workflow JSON data
     * @returns {Promise<Blob>} - Document blob ready for download
     */
    async generateDocument(workflowData) {
        const { title, steps, metadata } = workflowData;
        const recordedDate = new Date(metadata.recordedAt).toLocaleDateString();
        const recordedTime = new Date(metadata.recordedAt).toLocaleTimeString();

        // Create document sections
        const children = [];

        // Document title
        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: title,
                        bold: true,
                        size: 32,
                        color: "0066CC"
                    })
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // Subtitle
        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: "Automated Workflow Documentation",
                        size: 24,
                        color: "666666"
                    })
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // Generation timestamp
        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
                        size: 20,
                        color: "666666",
                        italics: true
                    })
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 600 }
            })
        );

        // Metadata table
        const metadataTable = new docx.Table({
            width: {
                size: 100,
                type: docx.WidthType.PERCENTAGE
            },
            borders: {
                top: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                left: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                right: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                insideVertical: { style: docx.BorderStyle.SINGLE, size: 1, color: "DDDDDD" }
            },
            rows: [
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Recording Date", bold: true })] })],
                            shading: { fill: "E9ECEF" }
                        }),
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: recordedDate })] })]
                        })
                    ]
                }),
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Recording Time", bold: true })] })],
                            shading: { fill: "E9ECEF" }
                        }),
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: recordedTime })] })]
                        })
                    ]
                }),
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Duration", bold: true })] })],
                            shading: { fill: "E9ECEF" }
                        }),
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: `${metadata.duration} seconds` })] })]
                        })
                    ]
                }),
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Total Steps", bold: true })] })],
                            shading: { fill: "E9ECEF" }
                        }),
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: `${steps.length} actions` })] })]
                        })
                    ]
                }),
                new docx.TableRow({
                    children: [
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: "Source URL", bold: true })] })],
                            shading: { fill: "E9ECEF" }
                        }),
                        new docx.TableCell({
                            children: [new docx.Paragraph({ children: [new docx.TextRun({ text: metadata.url, size: 18 })] })]
                        })
                    ]
                })
            ]
        });

        children.push(metadataTable);

        // Section title
        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: "Step-by-Step Workflow",
                        bold: true,
                        size: 28,
                        color: "0066CC"
                    })
                ],
                spacing: { before: 600, after: 400 },
                border: {
                    bottom: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "DDDDDD"
                    }
                }
            })
        );

        // Add steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // Step header with icon and action
            children.push(
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: `${step.icon} Step ${step.number}: `,
                            bold: true,
                            size: 24,
                            color: "0066CC"
                        }),
                        new docx.TextRun({
                            text: step.action,
                            bold: true,
                            size: 24,
                            color: "333333"
                        })
                    ],
                    spacing: { before: 300, after: 100 }
                })
            );

            // Step details if available
            if (step.details) {
                children.push(
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: step.details,
                                size: 20,
                                color: "666666"
                            })
                        ],
                        spacing: { after: 100 },
                        indent: { left: 400 },
                        shading: { fill: "F8F9FA" }
                    })
                );
            }

            // Timestamp
            children.push(
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: `Timestamp: ${step.timestamp}`,
                            size: 18,
                            color: "999999",
                            italics: true
                        })
                    ],
                    spacing: { after: 200 },
                    indent: { left: 400 }
                })
            );

            // Screenshot if available
            if (step.screenshot) {
                try {
                    // Convert base64 to blob for image insertion
                    const base64Data = step.screenshot.split(',')[1];
                    const imageBuffer = this.base64ToArrayBuffer(base64Data);
                    
                    children.push(
                        new docx.Paragraph({
                            children: [
                                new docx.ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 400,
                                        height: 250
                                    }
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 200 }
                        })
                    );

                    // Image caption
                    children.push(
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: `Screenshot captured at step ${step.number}`,
                                    size: 16,
                                    color: "999999",
                                    italics: true
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 300 }
                        })
                    );
                } catch (error) {
                    console.warn(`Could not add screenshot for step ${step.number}:`, error);
                    // Add placeholder text instead
                    children.push(
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: "[Screenshot not available]",
                                    size: 18,
                                    color: "CCCCCC",
                                    italics: true
                                })
                            ],
                            alignment: docx.AlignmentType.CENTER,
                            spacing: { after: 300 }
                        })
                    );
                }
            }

            // Add page break every 5 steps (except for the last step)
            if ((i + 1) % 5 === 0 && i < steps.length - 1) {
                children.push(
                    new docx.Paragraph({
                        children: [],
                        pageBreakBefore: true
                    })
                );
            }
        }

        // Footer
        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: "This document was automatically generated by Workflow Recorder",
                        size: 16,
                        color: "999999",
                        italics: true
                    })
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { before: 600, after: 100 },
                border: {
                    top: {
                        style: docx.BorderStyle.SINGLE,
                        size: 1,
                        color: "DDDDDD"
                    }
                }
            })
        );

        children.push(
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: `Generated on ${new Date().toISOString()}`,
                        size: 16,
                        color: "999999",
                        italics: true
                    })
                ],
                alignment: docx.AlignmentType.CENTER
            })
        );

        // Create the document
        const doc = new docx.Document({
            sections: [{
                properties: {
                    page: {
                        size: {
                            orientation: docx.PageOrientation.PORTRAIT,
                        },
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: children
            }]
        });

        // Generate and return the document blob
        return await docx.Packer.toBlob(doc);
    }

    /**
     * Convert base64 string to ArrayBuffer
     * @param {string} base64 - Base64 string
     * @returns {ArrayBuffer} - Array buffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Download the generated document
     * @param {Object} workflowData - The workflow JSON data
     * @param {string} filename - Optional filename (without extension)
     */
    async downloadDocument(workflowData, filename = null) {
        try {
            const blob = await this.generateDocument(workflowData);
            const finalFilename = filename ? `${filename}${this.fileExtension}` : `workflow-${Date.now()}${this.fileExtension}`;
            
            // Use FileSaver.js if available, otherwise fallback to standard method
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, finalFilename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = finalFilename;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error generating document:', error);
            throw error;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentGenerator;
} else {
    window.DocumentGenerator = DocumentGenerator;
}
