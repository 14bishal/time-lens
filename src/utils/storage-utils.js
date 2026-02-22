
(function (global) {
    global.TimeLens = global.TimeLens || {};

    /**
     * Storage Utilities for TimeLens
     */
    global.TimeLens.StorageUtils = (function () {

        const STORAGE_KEYS = {
            TIMEZONE: 'timelens_timezone',
            AUTO_DETECT: 'timelens_auto_detect_tz',
            USE_24HOUR: 'timelens_use_24hour',
            IS_ENABLED: 'timelens_enabled'
        };

        const DEFAULTS = {
            [STORAGE_KEYS.TIMEZONE]: Intl.DateTimeFormat().resolvedOptions().timeZone,
            [STORAGE_KEYS.AUTO_DETECT]: true,
            [STORAGE_KEYS.USE_24HOUR]: false,
            [STORAGE_KEYS.IS_ENABLED]: true
        };

        const getSettings = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(null, (items) => {
                    const settings = { ...DEFAULTS, ...items };
                    resolve(settings);
                });
            });
        };

        const saveSettings = (partialSettings) => {
            return new Promise((resolve) => {
                chrome.storage.local.set(partialSettings, () => {
                    resolve();
                });
            });
        };

        const onSettingsChanged = (callback) => {
            chrome.storage.onChanged.addListener(callback);
        };

        return {
            STORAGE_KEYS,
            getSettings,
            saveSettings,
            onSettingsChanged
        };

    })();

})(typeof globalThis !== 'undefined' ? globalThis : window);
