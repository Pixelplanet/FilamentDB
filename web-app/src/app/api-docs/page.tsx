'use client';

import { ApiReference } from '@scalar/nextjs-api-reference';
import { openApiSpec } from '@/lib/openapi';

/**
 * API Documentation Page
 * 
 * Interactive API documentation similar to FastAPI's automatic docs
 * Provides a beautiful UI to explore and test all API endpoints
 */
export default function ApiDocsPage() {
    return (
        <ApiReference
            configuration={{
                spec: {
                    content: openApiSpec,
                },
                theme: 'purple',
                layout: 'modern',
                darkMode: true,
                showSidebar: true,
                customCss: `
          .scalar-app {
            min-height: 100vh;
          }
        `,
            }}
        />
    );
}
