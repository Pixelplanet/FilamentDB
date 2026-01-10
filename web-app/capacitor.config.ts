import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.filamentdb',
  appName: 'FilamentDB',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    allowNavigation: ['*'],
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
