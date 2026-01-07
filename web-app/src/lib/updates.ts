import { Capacitor } from '@capacitor/core';
import semver from 'semver';

interface GitHubRelease {
    tag_name: string;
    assets: {
        name: string;
        browser_download_url: string;
    }[];
}

export interface UpdateInfo {
    available: boolean;
    latestVersion: string;
    currentVersion: string;
    downloadUrl: string;
}

export const checkForAppUpdate = async (): Promise<UpdateInfo> => {
    // Only verify updates on Android/Native (technically configured in Settings page, but this util is platform agnostic)
    const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

    try {
        const response = await fetch('https://api.github.com/repos/Pixelplanet/FilamentDB/releases/latest');
        if (!response.ok) {
            throw new Error('Failed to fetch latest release');
        }

        const data: GitHubRelease = await response.json();
        const latestTag = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix

        // Check if update is available
        const isUpdateAvailable = semver.gt(latestTag, currentVersion);

        // Find APK asset
        const apkAsset = data.assets.find(asset => asset.name === 'filamentdb.apk');
        const downloadUrl = apkAsset
            ? apkAsset.browser_download_url
            : `https://github.com/Pixelplanet/FilamentDB/releases/download/${data.tag_name}/filamentdb.apk`;

        return {
            available: isUpdateAvailable,
            latestVersion: latestTag,
            currentVersion,
            downloadUrl
        };
    } catch (error) {
        console.error('Error checking for updates:', error);
        return {
            available: false,
            latestVersion: currentVersion,
            currentVersion,
            downloadUrl: ''
        };
    }
};
