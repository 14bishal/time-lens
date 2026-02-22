// Content Script using Global Namespaces
// Expects date-utils.js and storage-utils.js to be loaded first
const { StorageUtils, DateUtils } = globalThis.TimeLens;

class TimeLensContent {
    constructor() {
        this.settings = {};
        this.observer = null;
        this.tooltip = null;
        this.popup = null;
        this.processedNodes = new WeakSet();
        this.scanTimeout = null;
    }

    async init() {
        this.settings = await StorageUtils.getSettings();
        if (!this.settings[StorageUtils.STORAGE_KEYS.IS_ENABLED]) return;

        this.createUI();
        this.scanPage();
        this.initObserver();
        this.initSelectionListener();

        // Listen for setting changes
        StorageUtils.onSettingsChanged((changes) => {
            for (const [key, { newValue }] of Object.entries(changes)) {
                this.settings[key] = newValue;
            }

            if (changes[StorageUtils.STORAGE_KEYS.IS_ENABLED]) {
                if (this.settings[StorageUtils.STORAGE_KEYS.IS_ENABLED]) {
                    this.scanPage();
                    this.initObserver();
                } else {
                    this.disconnectObserver();
                    this.removeHighlights();
                }
            }
        });
    }

    createUI() {
        if (document.querySelector('.timelens-popup')) {
            this.popup = document.querySelector('.timelens-popup');
            return;
        }

        this.popup = document.createElement('div');
        this.popup.className = 'timelens-popup';
        this.popup.innerHTML = `
      <span class="timelens-popup-time"></span>
      <button class="timelens-copy-btn" title="Copy to clipboard">
        <!-- Copy Icon -->
        <svg class="icon-copy" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        <!-- Check Icon (Hidden by default) -->
        <svg class="icon-check" viewBox="0 0 24 24" style="display:none;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </button>
    `;
        document.body.appendChild(this.popup);

        const btn = this.popup.querySelector('.timelens-copy-btn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent popup from closing if triggered by click
            const text = this.popup.querySelector('.timelens-popup-time').textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show Check Icon
                const copyIcon = btn.querySelector('.icon-copy');
                const checkIcon = btn.querySelector('.icon-check');

                copyIcon.style.display = 'none';
                checkIcon.style.display = 'block';
                btn.style.color = '#4ade80'; // Green

                setTimeout(() => {
                    copyIcon.style.display = 'block';
                    checkIcon.style.display = 'none';
                    btn.style.color = ''; // Reset color
                }, 2000);
            });
        });
    }

    get timezone() {
        return this.settings[StorageUtils.STORAGE_KEYS.AUTO_DETECT]
            ? DateUtils.getSystemTimezone()
            : this.settings[StorageUtils.STORAGE_KEYS.TIMEZONE];
    }

    formatTime(date) {
        return DateUtils.formatLocalTime(date, this.timezone, this.settings[StorageUtils.STORAGE_KEYS.USE_24HOUR]);
    }

    scanPage() {
        if (!this.settings[StorageUtils.STORAGE_KEYS.IS_ENABLED]) return;
        this.scanNode(document.body);
    }

    scanNode(node) {
        if (!node) return;
        const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE'];
        if (skipTags.includes(node.tagName) || node.isContentEditable) return;

        if (node.nodeType === Node.TEXT_NODE) {
            this.processTextNode(node);
            return;
        }

        const children = Array.from(node.childNodes);
        for (const child of children) {
            this.scanNode(child);
        }
    }

    processTextNode(textNode) {
        if (this.processedNodes.has(textNode)) return;
        if (!textNode.textContent || !/\d/.test(textNode.textContent)) return;

        const originalText = textNode.textContent;
        const parent = textNode.parentNode;
        if (!parent) return;

        const matches = [];
        DateUtils.TIME_PATTERNS.forEach(regex => {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(originalText)) !== null) {
                if (DateUtils.parseUTCDate(match[0])) {
                    matches.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0]
                    });
                }
            }
        });

        if (matches.length === 0) return;

        matches.sort((a, b) => a.start - b.start);
        const filteredMatches = [];
        let lastEnd = 0;
        for (const m of matches) {
            if (m.start >= lastEnd) {
                filteredMatches.push(m);
                lastEnd = m.end;
            }
        }

        if (filteredMatches.length === 0) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        filteredMatches.forEach(match => {
            if (match.start > lastIndex) {
                fragment.appendChild(document.createTextNode(originalText.slice(lastIndex, match.start)));
            }

            const span = document.createElement('span');
            span.className = 'timelens-detected';
            span.textContent = match.text;
            // No hover events attached

            fragment.appendChild(span);
            lastIndex = match.end;
        });

        if (lastIndex < originalText.length) {
            fragment.appendChild(document.createTextNode(originalText.slice(lastIndex)));
        }

        this.processedNodes.add(textNode);
        parent.replaceChild(fragment, textNode);
    }

    // attachHoverEvents removed

    initObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }

            if (shouldScan) {
                clearTimeout(this.scanTimeout);
                this.scanTimeout = setTimeout(() => {
                    mutations.forEach(m => {
                        m.addedNodes.forEach(node => this.scanNode(node));
                    });
                }, 500);
            }
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    removeHighlights() {
        const highlights = document.querySelectorAll('.timelens-detected');
        highlights.forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });
    }

    initSelectionListener() {
        document.addEventListener('mouseup', (e) => {
            setTimeout(() => {
                if (!this.settings[StorageUtils.STORAGE_KEYS.IS_ENABLED]) return;

                const selection = window.getSelection();
                const text = selection.toString().trim();

                if (!text || text.length > 100) {
                    // Only hide if we aren't hovering a detected element
                    // This interacting might be tricky.
                    // For now, if no selection, we check if we are hovering detected?
                    // But MouseUp happens everywhere. 
                    // Let's rely on hover logic to keep it open for hovered.
                    // If simply clicking (no selection), we might want to close if open?
                    if (!e.target.classList.contains('timelens-detected') && !this.popup.contains(e.target)) {
                        this.hidePopup();
                    }
                    return;
                }

                const date = DateUtils.parseUTCDate(text);

                if (date && !isNaN(date.getTime())) {
                    const local = this.formatTime(date);
                    if (selection.rangeCount > 0) {
                        this.showPopup(local, selection.getRangeAt(0));
                    }
                } else {
                    // If selection is invalid date, hide?
                    this.hidePopup();
                }
            }, 10);
        });

        document.addEventListener('mousedown', (e) => {
            if (this.popup && !this.popup.contains(e.target)) {
                // Don't close immediately if clicking on a detected element (it might be a selection start)
                if (!e.target.classList.contains('timelens-detected')) {
                    this.hidePopup();
                }
            }
        });
    }

    showPopup(text, source) {
        if (!this.popup) return;
        this.popup.querySelector('.timelens-popup-time').textContent = text;
        this.popup.classList.add('visible');

        let rect;
        if (source instanceof Range) {
            rect = source.getBoundingClientRect();
        } else if (source instanceof Element) {
            rect = source.getBoundingClientRect();
        } else {
            return;
        }

        const popupRect = this.popup.getBoundingClientRect();

        let top = rect.top + window.scrollY - popupRect.height - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popupRect.width / 2);

        if (top < window.scrollY) top = rect.bottom + window.scrollY + 10;

        // Prevent going off screen left/right
        if (left < 0) left = 10;
        if (left + popupRect.width > window.innerWidth) left = window.innerWidth - popupRect.width - 10;

        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
    }

    hidePopup() {
        if (this.popup) this.popup.classList.remove('visible');
    }
}

// Initialize
const app = new TimeLensContent();
app.init();
