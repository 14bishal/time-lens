
// Import utilities
try {
    importScripts('../utils/storage-utils.js');
} catch (e) {
    console.error("TimeLens: Failed to import scripts in background", e);
}

const { StorageUtils } = globalThis.TimeLens;

// Set default settings on installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // We can't access StorageUtils here if importScripts failed, but it shouldn't.
        if (!StorageUtils) return;

        StorageUtils.getSettings().then(current => {
            // If empty? getSettings returns defaults for missing keys.
            // Actually we want to force defaults on install if not present.
            // The getSettings logic merges defaults, but doesn't Save them.
            // Let's explicitly save defaults.
            const defaults = {
                [StorageUtils.STORAGE_KEYS.TIMEZONE]: Intl.DateTimeFormat().resolvedOptions().timeZone,
                [StorageUtils.STORAGE_KEYS.AUTO_DETECT]: true,
                [StorageUtils.STORAGE_KEYS.USE_24HOUR]: false,
                [StorageUtils.STORAGE_KEYS.IS_ENABLED]: true
            };
            StorageUtils.saveSettings(defaults);
            console.log('TimeLens: Default settings initialized.');
        });
    }
});
