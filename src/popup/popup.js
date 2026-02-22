
// Using Global Namespaces
const { StorageUtils, DateUtils } = window.TimeLens;

document.addEventListener('DOMContentLoaded', async () => {
    const timezoneSelect = document.getElementById('timezone-select');
    const autoDetectCheckbox = document.getElementById('auto-detect');
    const use24HourCheckbox = document.getElementById('use-24hour');
    const enabledCheckbox = document.getElementById('extension-enabled');

    // Populate Timezone Select
    const timezones = Intl.supportedValuesOf('timeZone');
    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = tz.replace(/_/g, ' ');
        timezoneSelect.appendChild(option);
    });

    // Load current settings
    const settings = await StorageUtils.getSettings();

    timezoneSelect.value = settings[StorageUtils.STORAGE_KEYS.TIMEZONE];
    autoDetectCheckbox.checked = settings[StorageUtils.STORAGE_KEYS.AUTO_DETECT];
    use24HourCheckbox.checked = settings[StorageUtils.STORAGE_KEYS.USE_24HOUR];
    enabledCheckbox.checked = settings[StorageUtils.STORAGE_KEYS.IS_ENABLED];

    // Disable dropdown if auto-detect is on
    timezoneSelect.disabled = autoDetectCheckbox.checked;

    // Event Listeners
    autoDetectCheckbox.addEventListener('change', (e) => {
        const isAuto = e.target.checked;
        timezoneSelect.disabled = isAuto;

        const updates = { [StorageUtils.STORAGE_KEYS.AUTO_DETECT]: isAuto };

        if (isAuto) {
            const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            timezoneSelect.value = systemTz;
            updates[StorageUtils.STORAGE_KEYS.TIMEZONE] = systemTz;
        }

        StorageUtils.saveSettings(updates);
    });

    timezoneSelect.addEventListener('change', (e) => {
        StorageUtils.saveSettings({ [StorageUtils.STORAGE_KEYS.TIMEZONE]: e.target.value });
    });

    use24HourCheckbox.addEventListener('change', (e) => {
        StorageUtils.saveSettings({ [StorageUtils.STORAGE_KEYS.USE_24HOUR]: e.target.checked });
    });

    enabledCheckbox.addEventListener('change', (e) => {
        StorageUtils.saveSettings({ [StorageUtils.STORAGE_KEYS.IS_ENABLED]: e.target.checked });
    });
});
