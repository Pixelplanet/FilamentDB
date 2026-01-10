// In standalone output mode, process.env.npm_package_version is not available at runtime.
// We must rely on the environment variable passed from Dockerfile.
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || 'unknown';
        const buildMode = process.env.BUILD_MODE || 'unknown';

        console.log('----------------------------------------------------------------');
        console.log(`🚀 FilamentDB Server Starting...`);
        console.log(`📦 Version: v${version}`);
        console.log(`🔧 Build Mode: ${buildMode}`);
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log('----------------------------------------------------------------');
    }
}
