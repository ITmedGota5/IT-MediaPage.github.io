// cookies.js

console.log('🍪 cookies.js script loaded successfully');

// Detect if we are running locally (file://) or on a server (http/https)
const isLocalFile = window.location.protocol === 'file:';

// ============================
// COOKIE CONSENT SYSTEM
// ============================
const CookieConsent = {
    COOKIE_NAME: 'itmedia_hoganas_consent',
    COOKIE_EXPIRY_DAYS: 365,

    getConsent() {
        if (isLocalFile) {
            const data = localStorage.getItem(this.COOKIE_NAME);
            try { return data ? JSON.parse(data) : null; } 
            catch (e) { return null; }
        }
        const name = this.COOKIE_NAME + '=';
        const decoded = decodeURIComponent(document.cookie);
        const ca = decoded.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) === 0) {
                try { return JSON.parse(c.substring(name.length)); } 
                catch (e) { return null; }
            }
        }
        return null;
    },

    setConsent(preferences) {
        const consentData = {
            necessary: true,
            functional: preferences.functional || false,
            analytics: preferences.analytics || false,
            marketing: preferences.marketing || false,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        if (isLocalFile) {
            localStorage.setItem(this.COOKIE_NAME, JSON.stringify(consentData));
            return consentData;
        }

        const expires = new Date();
        expires.setTime(expires.getTime() + (this.COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
        
        document.cookie = [
            this.COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(consentData)),
            'expires=' + expires.toUTCString(),
            'path=/',
            'SameSite=Lax'
        ].join('; ');

        console.log('🍪 Consent saved:', consentData);
        return consentData;
    },

    clearConsent() {
        if (isLocalFile) {
            localStorage.removeItem(this.COOKIE_NAME);
        } else {
            document.cookie = this.COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    },

    hasConsented() {
        return this.getConsent() !== null;
    },

    getCurrentPreferences() {
        const prefs = { necessary: true };
        document.querySelectorAll('.cookie-toggle[data-category]').forEach(toggle => {
            const category = toggle.dataset.category;
            if (category !== 'necessary') {
                prefs[category] = toggle.classList.contains('active');
            }
        });
        return prefs;
    },

    applyPreferencesToUI(preferences) {
        document.querySelectorAll('.cookie-toggle[data-category]').forEach(toggle => {
            const category = toggle.dataset.category;
            if (category === 'necessary') {
                toggle.classList.add('active');
            } else if (preferences && preferences[category]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        });
    }
};

// ============================
// INJECT HTML INTO THE PAGE (WITH DUPLICATE PREVENTION)
// ============================
const cookieBannerHTML = `
<div id="cookie-banner" class="cookie-banner fixed bottom-0 left-0 right-0 z-[100] bg-white border-t-2 border-brand-blue shadow-2xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div class="flex items-start gap-4 flex-1">
                <div class="bg-brand-blue/10 p-3 rounded-lg flex-shrink-0 mt-1">
                    <i class="fa-solid fa-cookie-bite text-brand-blue text-2xl"></i>
                </div>
                <div>
                    <h3 class="font-display text-lg text-brand-black mb-1">Vi använder cookies</h3>
                    <p class="text-sm text-gray-600 leading-relaxed">
                        Vi använder cookies för att förbättra din upplevelse på vår webbplats, analysera trafik och anpassa innehåll. 
                        <a href="#" class="cookie-read-more-link text-brand-blue font-semibold hover:underline">Läs mer</a>
                    </p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0">
                <button id="cookie-settings-btn" class="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:border-brand-blue hover:text-brand-blue transition whitespace-nowrap">
                    <i class="fa-solid fa-sliders mr-1"></i> Hantera cookies
                </button>
                <button id="cookie-accept-selected" class="px-5 py-2.5 bg-brand-blue text-white rounded-lg font-semibold text-sm hover:bg-surface-darkblue transition whitespace-nowrap">
                    Acceptera valda
                </button>
                <button id="cookie-accept-all" class="px-5 py-2.5 bg-brand-red text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition whitespace-nowrap">
                    Acceptera alla
                </button>
            </div>
        </div>
    </div>
</div>
`;

const cookieModalHTML = `
<div id="cookie-settings-overlay" class="cookie-settings-overlay fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="cookie-settings-panel bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-surface-darkblue rounded-t-2xl px-6 sm:px-8 py-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i class="fa-solid fa-shield-halved text-white text-xl"></i>
                <h2 class="font-display text-xl text-white">Cookieinställningar</h2>
            </div>
            <button id="cookie-settings-close" class="text-white/70 hover:text-white transition text-2xl">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="px-6 sm:px-8 py-6 space-y-6">
            <p class="text-sm text-gray-600 leading-relaxed">Välj vilka cookies du vill tillåta. Nödvändiga cookies kan inte inaktiveras.</p>
            <div class="border border-gray-200 rounded-xl p-5">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-lock text-brand-blue text-sm"></i><h4 class="font-semibold text-brand-black">Nödvändiga</h4></div>
                        <p class="text-xs text-gray-500">Krävs för att webbplatsen ska fungera.</p>
                    </div>
                    <div class="cookie-toggle locked active" data-category="necessary"></div>
                </div>
            </div>
            <div class="border border-gray-200 rounded-xl p-5">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-gear text-brand-blue text-sm"></i><h4 class="font-semibold text-brand-black">Funktionella</h4></div>
                        <p class="text-xs text-gray-500">Kom ihåg val som språk och region.</p>
                    </div>
                    <div class="cookie-toggle" data-category="functional"></div>
                </div>
            </div>
            <div class="border border-gray-200 rounded-xl p-5">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-chart-line text-brand-blue text-sm"></i><h4 class="font-semibold text-brand-black">Analys</h4></div>
                        <p class="text-xs text-gray-500">Anonym data om hur sidan används.</p>
                    </div>
                    <div class="cookie-toggle" data-category="analytics"></div>
                </div>
            </div>
            <div class="border border-gray-200 rounded-xl p-5">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-bullhorn text-brand-blue text-sm"></i><h4 class="font-semibold text-brand-black">Marknadsföring</h4></div>
                        <p class="text-xs text-gray-500">Relevant reklam och kampanjspårning.</p>
                    </div>
                    <div class="cookie-toggle" data-category="marketing"></div>
                </div>
            </div>
        </div>
        <div class="px-6 sm:px-8 py-5 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end">
            <button id="cookie-modal-decline" class="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:border-brand-red hover:text-brand-red transition">Avvisa alla</button>
            <button id="cookie-modal-save" class="px-6 py-2.5 bg-brand-blue text-white rounded-lg font-semibold text-sm hover:bg-surface-darkblue transition">Spara valda</button>
            <button id="cookie-modal-accept-all" class="px-6 py-2.5 bg-brand-red text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition">Acceptera alla</button>
        </div>
    </div>
</div>
`;


// ============================
// WAIT FOR PAGE TO LOAD FULLY
// ============================
document.addEventListener('DOMContentLoaded', () => {
    
    // SAFETY CHECK: Only inject if it doesn't already exist in the HTML
    if (!document.getElementById('cookie-banner')) {
        document.body.insertAdjacentHTML('beforeend', cookieBannerHTML);
        document.body.insertAdjacentHTML('beforeend', cookieModalHTML);
        console.log('🍪 Cookie HTML injected into page');
    } else {
        console.log('🍪 Cookie HTML already exists on page. Skipping injection.');
    }

    const cookieBanner = document.getElementById('cookie-banner');
    const cookieSettingsOverlay = document.getElementById('cookie-settings-overlay');

    function showBanner() { 
        setTimeout(() => {
            cookieBanner.classList.add('visible');
        }, 500); 
    }

    function hideBanner() { 
        cookieBanner.classList.remove('visible'); 
    }

    function openSettings() { 
        CookieConsent.applyPreferencesToUI(CookieConsent.getConsent());
        cookieSettingsOverlay.classList.add('visible'); 
        document.body.style.overflow = 'hidden'; 
    }

    function closeSettings() { 
        cookieSettingsOverlay.classList.remove('visible'); 
        document.body.style.overflow = ''; 
    }

    function acceptAll() { 
        CookieConsent.setConsent({ functional: true, analytics: true, marketing: true }); 
        hideBanner(); 
        closeSettings(); 
    }

    function acceptSelected() { 
        CookieConsent.setConsent(CookieConsent.getCurrentPreferences()); 
        hideBanner(); 
        closeSettings(); 
    }

    function declineAll() { 
        CookieConsent.setConsent({ functional: false, analytics: false, marketing: false }); 
        hideBanner(); 
        closeSettings(); 
    }

    // Toggle switches
    document.querySelectorAll('.cookie-toggle[data-category]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (toggle.dataset.category !== 'necessary') {
                toggle.classList.toggle('active');
            }
        });
    });

    // Banner Buttons
    document.getElementById('cookie-settings-btn').addEventListener('click', openSettings);
    document.getElementById('cookie-accept-selected').addEventListener('click', acceptSelected);
    document.getElementById('cookie-accept-all').addEventListener('click', acceptAll);
    document.querySelector('.cookie-read-more-link').addEventListener('click', (e) => { 
        e.preventDefault(); 
        openSettings(); 
    });

    // Modal Buttons
    document.getElementById('cookie-settings-close').addEventListener('click', closeSettings);
    document.getElementById('cookie-modal-decline').addEventListener('click', declineAll);
    document.getElementById('cookie-modal-save').addEventListener('click', acceptSelected);
    document.getElementById('cookie-modal-accept-all').addEventListener('click', acceptAll);

    // Close modal on overlay click
    cookieSettingsOverlay.addEventListener('click', (e) => { 
        if (e.target === cookieSettingsOverlay) closeSettings(); 
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape' && cookieSettingsOverlay.classList.contains('visible')) closeSettings(); 
    });

    // Footer "Cookies" link
    const footerCookiesLink = document.getElementById('footer-cookies-link');
    if (footerCookiesLink) {
        footerCookiesLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSettings();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ============================
    // INIT: Check if user has already consented
    // ============================
    const existingConsent = CookieConsent.getConsent();
    if (existingConsent) {
        console.log('🍪 Existing consent found.');
    } else {
        showBanner();
    }

});