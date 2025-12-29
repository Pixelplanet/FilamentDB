/**
 * OpenAPI Specification for FilamentDB API
 * 
 * This file defines the complete API documentation
 * View the interactive docs at /api-docs
 */

import type { OpenAPIObject } from 'openapi3-ts/oas31';

export const openApiSpec: OpenAPIObject = {
    openapi: '3.1.0',
    info: {
        title: 'FilamentDB API',
        description: `
# FilamentDB REST API

A complete API for managing 3D printer filament spools.

## Features
- **File-based storage**: Each spool stored as a separate JSON file
- **Full CRUD operations**: Create, Read, Update, Delete spools
- **Web scraping**: Import spool data from product URLs
- **Import/Export**: Bulk operations for backup and migration
- **Sync**: Optional device synchronization

## Authentication
Currently, this API does not require authentication. It's designed for personal/local use.

## Base URL
- **Web**: \`/api\` (relative to your domain)
- **Native App**: Configured via \`NEXT_PUBLIC_API_URL\` environment variable
    `,
        version: '1.0.0',
        contact: {
            name: 'FilamentDB',
            url: 'https://github.com/Pixelplanet/FilamentDB'
        }
    },
    servers: [
        {
            url: '/api',
            description: 'Current server'
        }
    ],
    tags: [
        {
            name: 'Spools',
            description: 'Manage filament spools'
        },
        {
            name: 'Scraping',
            description: 'Web scraping for product data'
        },
        {
            name: 'Sync',
            description: 'Device synchronization'
        }
    ],
    paths: {
        '/spools': {
            get: {
                tags: ['Spools'],
                summary: 'List all spools',
                description: 'Returns a list of all spools sorted by last updated time',
                operationId: 'listSpools',
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Spool' }
                                },
                                example: [
                                    {
                                        serial: 'ABC123',
                                        brand: 'Prusament',
                                        type: 'PLA',
                                        color: 'Galaxy Black',
                                        colorHex: '#1a1a1a',
                                        weightRemaining: 850,
                                        weightTotal: 1000,
                                        diameter: 1.75,
                                        lastUpdated: 1704067200000
                                    }
                                ]
                            }
                        }
                    },
                    '500': {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Spools'],
                summary: 'Create or update a spool',
                description: 'Creates a new spool or updates an existing one (by serial number)',
                operationId: 'createSpool',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Spool' },
                            example: {
                                serial: 'ABC123',
                                brand: 'Prusament',
                                type: 'PETG',
                                color: 'Prusa Orange',
                                colorHex: '#ff6600',
                                weightRemaining: 1000,
                                weightTotal: 1000,
                                diameter: 1.75,
                                temperatureNozzleMin: 230,
                                temperatureNozzleMax: 250,
                                temperatureBedMin: 80,
                                temperatureBedMax: 90
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Spool created/updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        filename: { type: 'string' },
                                        spool: { $ref: '#/components/schemas/Spool' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' }
                            }
                        }
                    }
                }
            }
        },
        '/spools/{serial}': {
            get: {
                tags: ['Spools'],
                summary: 'Get a specific spool',
                description: 'Retrieves a single spool by its serial number',
                operationId: 'getSpool',
                parameters: [
                    {
                        name: 'serial',
                        in: 'path',
                        required: true,
                        description: 'Spool serial number',
                        schema: { type: 'string' },
                        example: 'ABC123'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Spool found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Spool' }
                            }
                        }
                    },
                    '404': {
                        description: 'Spool not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' }
                            }
                        }
                    }
                }
            },
            delete: {
                tags: ['Spools'],
                summary: 'Delete a spool',
                description: 'Deletes a spool by its serial number',
                operationId: 'deleteSpool',
                parameters: [
                    {
                        name: 'serial',
                        in: 'path',
                        required: true,
                        description: 'Spool serial number',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Spool deleted successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Spool not found'
                    }
                }
            }
        },
        '/spools/export': {
            get: {
                tags: ['Spools'],
                summary: 'Export all spools',
                description: 'Downloads all spools as a ZIP file containing individual JSON files',
                operationId: 'exportSpools',
                responses: {
                    '200': {
                        description: 'ZIP file with all spools',
                        content: {
                            'application/zip': {
                                schema: {
                                    type: 'string',
                                    format: 'binary'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/spools/import': {
            post: {
                tags: ['Spools'],
                summary: 'Import spools from ZIP',
                description: 'Uploads a ZIP file containing spool JSON files',
                operationId: 'importSpools',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    file: {
                                        type: 'string',
                                        format: 'binary',
                                        description: 'ZIP file containing spool JSON files'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Import results',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        imported: { type: 'number' },
                                        skipped: { type: 'number' },
                                        errors: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/scrape': {
            get: {
                tags: ['Scraping'],
                summary: 'Scrape product page',
                description: 'Extracts filament information from a product URL using web scraping',
                operationId: 'scrapeUrl',
                parameters: [
                    {
                        name: 'url',
                        in: 'query',
                        required: true,
                        description: 'Product page URL to scrape',
                        schema: { type: 'string' },
                        example: 'https://prusament.com/materials/prusament-pla-prusa-orange/'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successfully scraped data',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        brand: { type: 'string' },
                                        type: { type: 'string' },
                                        color: { type: 'string' },
                                        colorHex: { type: 'string' },
                                        weightTotal: { type: 'number' },
                                        diameter: { type: 'number' },
                                        temperatureNozzleMin: { type: 'number' },
                                        temperatureNozzleMax: { type: 'number' },
                                        temperatureBedMin: { type: 'number' },
                                        temperatureBedMax: { type: 'number' },
                                        density: { type: 'number' },
                                        logs: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        }
                                    }
                                },
                                example: {
                                    brand: 'Prusament',
                                    type: 'PLA',
                                    color: 'Prusa Orange',
                                    colorHex: '#ff6600',
                                    weightTotal: 1000,
                                    diameter: 1.75,
                                    logs: ['Scraped from Prusament.com']
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid URL or unsupported domain'
                    }
                }
            }
        },
        '/proxy-scrape': {
            get: {
                tags: ['Scraping'],
                summary: 'Scrape via proxy',
                description: 'Alternative scraping endpoint using a proxy service (for CORS-restricted sites)',
                operationId: 'proxyScrape',
                parameters: [
                    {
                        name: 'url',
                        in: 'query',
                        required: true,
                        description: 'Product page URL to scrape',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successfully scraped data'
                    }
                }
            }
        },
        '/sync': {
            post: {
                tags: ['Sync'],
                summary: 'Sync spools between devices',
                description: 'Synchronizes spool data between multiple devices',
                operationId: 'syncSpools',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    spools: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Spool' }
                                    },
                                    lastSyncTime: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Sync completed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        merged: { type: 'number' },
                                        conflicts: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            Spool: {
                type: 'object',
                required: ['serial', 'type'],
                properties: {
                    id: {
                        type: 'integer',
                        description: 'Auto-incremented ID (legacy, use serial instead)'
                    },
                    serial: {
                        type: 'string',
                        description: 'Unique serial number (from NFC tag, barcode, or manual)',
                        example: 'ABC123'
                    },
                    brand: {
                        type: 'string',
                        description: 'Manufacturer brand name',
                        example: 'Prusament'
                    },
                    type: {
                        type: 'string',
                        description: 'Filament material type',
                        enum: ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PC', 'Nylon', 'Other'],
                        example: 'PLA'
                    },
                    color: {
                        type: 'string',
                        description: 'Color name',
                        example: 'Galaxy Black'
                    },
                    colorHex: {
                        type: 'string',
                        description: 'Hex color code',
                        pattern: '^#[0-9A-Fa-f]{6}$',
                        example: '#1a1a1a'
                    },
                    diameter: {
                        type: 'number',
                        description: 'Filament diameter in mm',
                        enum: [1.75, 2.85],
                        default: 1.75
                    },
                    weightTotal: {
                        type: 'number',
                        description: 'Total weight of filament in grams (when new)',
                        example: 1000
                    },
                    weightRemaining: {
                        type: 'number',
                        description: 'Remaining weight in grams',
                        example: 850
                    },
                    weightSpool: {
                        type: 'number',
                        description: 'Tare weight of empty spool in grams',
                        example: 200
                    },
                    density: {
                        type: 'number',
                        description: 'Material density in g/cm³',
                        example: 1.24
                    },
                    temperatureNozzleMin: {
                        type: 'number',
                        description: 'Minimum nozzle temperature in °C',
                        example: 200
                    },
                    temperatureNozzleMax: {
                        type: 'number',
                        description: 'Maximum nozzle temperature in °C',
                        example: 220
                    },
                    temperatureBedMin: {
                        type: 'number',
                        description: 'Minimum bed temperature in °C',
                        example: 60
                    },
                    temperatureBedMax: {
                        type: 'number',
                        description: 'Maximum bed temperature in °C',
                        example: 60
                    },
                    batchNumber: {
                        type: 'string',
                        description: 'Manufacturing batch number'
                    },
                    productionDate: {
                        type: 'string',
                        format: 'date',
                        description: 'Production date (ISO 8601)'
                    },
                    notes: {
                        type: 'string',
                        description: 'User notes'
                    },
                    detailUrl: {
                        type: 'string',
                        format: 'uri',
                        description: 'Original product URL (if imported from web)'
                    },
                    lastScanned: {
                        type: 'number',
                        description: 'Last scan timestamp (Unix milliseconds)'
                    },
                    lastUpdated: {
                        type: 'number',
                        description: 'Last update timestamp (Unix milliseconds)'
                    },
                    createdAt: {
                        type: 'number',
                        description: 'Creation timestamp (Unix milliseconds)'
                    }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    error: {
                        type: 'string',
                        description: 'Error message'
                    },
                    details: {
                        type: 'string',
                        description: 'Additional error details'
                    }
                }
            }
        }
    }
};
