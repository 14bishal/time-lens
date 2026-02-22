
(function (global) {
    global.TimeLens = global.TimeLens || {};

    /**
     * Date Utilities for TimeLens
     */
    global.TimeLens.DateUtils = (function () {

        const TIME_PATTERNS = [
            // ISO 8601 with Z or Offset (e.g., +05:30, -0400)
            /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})\b/g,

            // YYYY-MM-DD HH:mm:ss UTC/GMT
            /\b\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(?:UTC|GMT)\b/g,

            // MMM DD HH:mm(:ss) UTC/GMT
            /\b[A-Za-z]{3}\s+\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\s+(?:UTC|GMT)\b/g,

            // Implicit UTC: YYYY-MM-DD HH:mm(:ss) (No timezone)
            /\b\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?\b/g
        ];

        function isValidDate(dateString) {
            const date = new Date(dateString);
            return !isNaN(date.getTime());
        }

        function parseUTCDate(dateString) {
            if (!dateString) return null;
            let cleanString = dateString.trim();

            // Check if it already has timezone info
            const hasTimezone = /Z|UTC|GMT|[+-]\d{2}:?\d{2}/.test(cleanString);

            // If strictly YYYY-MM-DD HH:mm... and no timezone, append UTC to force UTC interpretation
            if (!hasTimezone && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(cleanString)) {
                cleanString += ' UTC';
            }

            const date = new Date(cleanString);
            if (isNaN(date.getTime())) return null;
            return date;
        }

        function formatLocalTime(date, timezone, use24Hour = false) {
            try {
                const options = {
                    timeZone: timezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: !use24Hour,
                    timeZoneName: 'short'
                };
                return new Intl.DateTimeFormat('default', options).format(date);
            } catch (error) {
                console.error('TimeLens: Error formatting date', error);
                return date.toLocaleString();
            }
        }

        function getSystemTimezone() {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        return {
            TIME_PATTERNS,
            isValidDate,
            parseUTCDate,
            formatLocalTime,
            getSystemTimezone
        };

    })();

})(typeof globalThis !== 'undefined' ? globalThis : window);
