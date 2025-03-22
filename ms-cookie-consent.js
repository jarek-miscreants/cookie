// Google Cookie Consent Script (TCF v2 & Google Consent Mode v2 Compliant)

/**
 * Cookie Consent Manager - IIFE Module Pattern
 * This keeps all functionality encapsulated and avoids global scope pollution
 */
(function () {
  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  function gtag() { window.dataLayer.push(arguments); }

  // Set default consent to denied for all except security (required)
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500 // Wait up to 500ms for consent update
  });

  // Prevent duplicate initialization
  if (window.ConsentManagerInitialized) {
    return;
  }

  window.ConsentManagerInitialized = true;

  // DOM Ready handler - more efficient than DOMContentLoaded
  function onDOMReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  // Utility functions for DOM operations
  const DOMUtils = {
    // Cache for DOM elements to avoid repeated queries
    elementCache: {},

    // Get element(s) with caching
    getElements(selector, useCache = true) {
      if (useCache && this.elementCache[selector]) {
        return this.elementCache[selector];
      }

      const elements = document.querySelectorAll(selector);
      if (useCache) {
        this.elementCache[selector] = elements;
      }
      return elements;
    },

    // Add event listener with delegation support
    addEventListeners(selector, eventType, handler) {
      const elements = this.getElements(selector);
      elements.forEach(element => {
        element.addEventListener(eventType, handler);
      });
    },

    // Show element with animation
    showElement(element, animationClass = 'active', displayStyle = 'block') {
      element.style.display = displayStyle;
      // Force a reflow before adding the active class for animation
      void element.offsetWidth;
      setTimeout(() => element.classList.add(animationClass), 10);
    },

    // Hide element with animation
    hideElement(element, animationClass = 'active', delay = 400) {
      element.classList.remove(animationClass);
      setTimeout(() => {
        element.style.display = 'none';
      }, delay);
    }
  };

  // Core consent manager functionality
  const ConsentManager = {
    isEU: false,
    bannerType: 'dialog',

    // Initialize the consent system
    init() {
      // Detect user region and banner type
      this.isEU = this.detectEUUser();
      this.bannerType = this.detectBannerType();

      // Setup event handlers and disable non-consented scripts
      this.setupDialogEventHandlers();
      this.disableNonConsentedScripts();
      this.activateForcedScripts();

      // Handle existing consent or show banner
      if (localStorage.getItem('cookieConsent')) {
        const preferences = JSON.parse(localStorage.getItem('cookieConsent'));
        this.activateScriptsByPreferences(preferences);
        this.updateGoogleConsentMode(preferences);
      } else {
        // Default preferences
        const defaultPreferences = {
          necessary: true,
          preferences: false,
          statistics: false,
          marketing: false
        };

        // Show banner based on region
        if (this.isEU) {
          this.showBanner();
        } else {
          this.showBanner(); // Same behavior for now, but could be customized
        }

        this.updateGoogleConsentMode(defaultPreferences);
      }

      // Initialize GTM and event listeners
      this.initializeGTMConsent();
      this.setupEventListeners();
    },

    // Detect the type of banner present in the document
    detectBannerType() {
      if (DOMUtils.getElements('[data-consent-banner="dialog"]', false).length) {
        return 'dialog';
      } else if (DOMUtils.getElements('[data-consent-banner="horizontal"]', false).length) {
        return 'horizontal';
      }
      return 'dialog'; // Default
    },

    // Activate scripts that are forced to load regardless of consent
    activateForcedScripts() {
      const forcedPlaceholders = DOMUtils.getElements(
        'script[type="text/plain"][script-type^="!"]',
        false
      );

      let activatedCount = 0;

      forcedPlaceholders.forEach(placeholder => {
        const script = this.createActiveScriptFromPlaceholder(placeholder);
        placeholder.parentNode.replaceChild(script, placeholder);
        activatedCount++;
      });
    },

    // Create an active script element from a placeholder
    createActiveScriptFromPlaceholder(placeholder) {
      const script = document.createElement('script');

      // Restore original type and attributes
      script.type = placeholder.getAttribute('data-original-type') || 'application/javascript';
      script.setAttribute('script-type', placeholder.getAttribute('script-type'));

      // Copy other attributes
      if (placeholder.hasAttribute('data-src')) script.src = placeholder.getAttribute(
        'data-src');
      if (placeholder.id) script.id = placeholder.id;
      if (placeholder.hasAttribute('data-async')) script.async = true;
      if (placeholder.hasAttribute('data-defer')) script.defer = true;

      // Copy content
      script.textContent = placeholder.textContent;

      return script;
    },

    // Setup dialog event handlers for backdrop clicks and ESC key
    setupDialogEventHandlers() {
      // Handle dialog backdrop clicks
      DOMUtils.getElements('dialog', false).forEach(dialog => {
        if (!dialog._backdropClickHandlerAdded) {
          dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
              window.CookieConsentActions.hidePreferences();
            }
          });
          dialog._backdropClickHandlerAdded = true;
        }
      });

      // Add ESC key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOMUtils.getElements('dialog[open]', false).length > 0) {
          window.CookieConsentActions.hidePreferences();
        }
      });
    },

    // Simple method to detect if user is likely from EU
    detectEUUser() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const euTimezones = [
        'Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Europe/Zagreb',
        'Europe/Nicosia', 'Europe/Prague', 'Europe/Copenhagen', 'Europe/Tallinn',
        'Europe/Helsinki', 'Europe/Paris', 'Europe/Berlin', 'Europe/Athens',
        'Europe/Budapest', 'Europe/Dublin', 'Europe/Rome', 'Europe/Riga',
        'Europe/Vilnius', 'Europe/Luxembourg', 'Europe/Malta', 'Europe/Amsterdam',
        'Europe/Warsaw', 'Europe/Lisbon', 'Europe/Bucharest', 'Europe/Bratislava',
        'Europe/Ljubljana', 'Europe/Madrid', 'Europe/Stockholm', 'Europe/London'
      ];

      return euTimezones.includes(timezone);
    },

    // Show the banner with animation
    showBanner() {
      const banners = DOMUtils.getElements('[data-consent-banner]', false);
      banners.forEach(banner => DOMUtils.showElement(banner));
    },

    // Hide the banner with animation
    hideBanner() {
      const banners = DOMUtils.getElements('[data-consent-banner]', false);
      banners.forEach(banner => DOMUtils.hideElement(banner));
    },

    // Set up consolidated event listeners using delegation where possible
    setupEventListeners() {
      // Map actions to handler functions
      const actionHandlers = {
        'accept-all': (e) => {
          e.preventDefault();
          window.CookieConsentActions.acceptAll();
        },
        'reject-all': (e) => {
          e.preventDefault();
          window.CookieConsentActions.rejectAll();
        },
        'show-preferences': (e) => {
          e.preventDefault();
          window.CookieConsentActions.showPreferences();

          // Handle horizontal banner UI updates
          const horizontalBanner = DOMUtils.getElements(
            '[data-consent-banner="horizontal"]', false)[0];
          if (horizontalBanner) {
            DOMUtils.getElements('[data-consent-action="save-preferences"]', false)
              .forEach(btn => btn.classList.add('is-active'));
          }
        },
        'save-preferences': (e) => {
          e.preventDefault();
          window.CookieConsentActions.savePreferences();
        },
        'close-preferences': (e) => {
          e.preventDefault();
          window.CookieConsentActions.hidePreferences();
        },
        'accept-all-preferences': (e) => {
          e.preventDefault();
          window.CookieConsentActions.acceptAllAndClose();
        },
        'manage-cookies': (e) => {
          e.preventDefault();
          window.CookieConsentActions.showPreferences();
        }
      };

      // Add listeners for each action type
      Object.keys(actionHandlers).forEach(action => {
        DOMUtils.addEventListeners(`[data-consent-action="${action}"]`, 'click',
          actionHandlers[action]);
      });

      // Dialog close buttons
      DOMUtils.addEventListeners('[data-consent="dialogClose"]', 'click', (e) => {
        e.preventDefault();
        window.CookieConsentActions.hidePreferences();
      });
    },

    // Show the preferences panel with up-to-date information
    showPreferencesPanel() {
      // Get scripts by category and update counts in the UI
      const scriptsByCategory = this.getScriptsByCategory();
      this.updateCategoryCounts(scriptsByCategory);
      this.updateScriptLists(scriptsByCategory);

      // Update checkbox states based on saved preferences
      this.updateCheckboxesFromSavedPreferences();

      // Show panels based on banner type
      if (this.bannerType === 'dialog') {
        this.showDialogPreferences();
      } else {
        this.showHorizontalPreferences();
      }
    },

    // Update category counts in the UI
    updateCategoryCounts(scriptsByCategory) {
      ['necessary', 'preferences', 'statistics', 'marketing'].forEach(category => {
        DOMUtils.getElements(`[data-consent-category-count="${category}"]`, false)
          .forEach(element => {
            element.textContent = scriptsByCategory[category].length;
          });
      });
    },

    // Update script lists in the UI
    updateScriptLists(scriptsByCategory) {
      ['necessary', 'preferences', 'statistics', 'marketing'].forEach(category => {
        this.updateScriptList(category, scriptsByCategory[category]);
      });
    },

    // Update checkbox states from saved preferences
    updateCheckboxesFromSavedPreferences() {
      const savedPreferences = localStorage.getItem('cookieConsent') ?
        JSON.parse(localStorage.getItem('cookieConsent')) :
        {
          necessary: true,
          preferences: false,
          statistics: false,
          marketing: false
        };

      ['preferences', 'statistics', 'marketing'].forEach(category => {
        DOMUtils.getElements(`[data-consent-checkbox="${category}"]`, false)
          .forEach(checkbox => {
            checkbox.checked = savedPreferences[category];
          });
      });
    },

    // Show dialog-style preferences
    showDialogPreferences() {
      const panels = DOMUtils.getElements('[data-consent-preferences]', false);
      panels.forEach(panel => {
        // Reset Webflow form display issues
        this.resetWebflowFormIssues(panel);

        // Find and show dialog
        const dialog = panel.closest('dialog');
        if (dialog) {
          dialog.showModal();
        } else {
          // Fallback display method
          DOMUtils.showElement(panel);
        }
      });
    },

    // Show horizontal-style preferences
    showHorizontalPreferences() {
      const horizontalBanner = DOMUtils.getElements('[data-consent-banner="horizontal"]',
        false)[0];

      if (horizontalBanner) {
        const preferencesInHorizontal = DOMUtils.getElements('[data-consent-preferences]',
          false, horizontalBanner);

        preferencesInHorizontal.forEach(panel => {
          this.resetWebflowFormIssues(panel);
          DOMUtils.showElement(panel);
        });
      } else {
        DOMUtils.getElements('[data-consent-preferences]', false).forEach(panel => {
          DOMUtils.showElement(panel);
        });
      }
    },

    // Reset Webflow form display issues
    resetWebflowFormIssues(panel) {
      // Reset any Webflow form display issues
      panel.querySelectorAll('form').forEach(form => {
        form.style.display = 'block';
      });

      // Hide any success/error messages
      panel.querySelectorAll('.w-form-done, .w-form-fail').forEach(msg => {
        msg.style.display = 'none';
      });
    },

    // Hide the preferences panel
    hidePreferencesPanel() {
      if (this.bannerType === 'dialog') {
        this.hideDialogPreferences();
      } else {
        this.hideHorizontalPreferences();
      }
    },

    // Hide dialog-style preferences
    hideDialogPreferences() {
      const panels = DOMUtils.getElements('[data-consent-preferences]', false);
      panels.forEach(panel => {
        const dialog = panel.closest('dialog');
        if (dialog) {
          dialog.close();
        } else {
          DOMUtils.hideElement(panel);
        }
      });
    },

    // Hide horizontal-style preferences
    hideHorizontalPreferences() {
      const horizontalBanner = DOMUtils.getElements('[data-consent-banner="horizontal"]',
        false)[0];

      if (horizontalBanner) {
        const preferencesInHorizontal = horizontalBanner.querySelectorAll(
          '[data-consent-preferences]');
        preferencesInHorizontal.forEach(panel => DOMUtils.hideElement(panel));
      } else {
        // Fallback
        DOMUtils.getElements('[data-consent-preferences]', false).forEach(panel => {
          DOMUtils.hideElement(panel);
        });
      }
    },

    // Update the script list for a category
    updateScriptList(category, scripts) {
      const container = document.querySelector(`[data-consent-script-list="${category}"]`);
      if (!container) return;

      // Clear the container
      container.innerHTML = '';

      // Add each script to the list
      scripts.forEach(script => {
        const listItem = document.createElement('li');
        listItem.textContent = script.src + (script.id !== 'No ID' ? ` (ID: ${script.id})` :
          '');
        container.appendChild(listItem);
      });
    },

    // Set consent preferences and update storage/UI
    setConsent(preferences) {
      // Store consent with timestamp
      const consentData = {
        ...preferences,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      localStorage.setItem('cookieConsent', JSON.stringify(consentData));

      // Activate scripts and update consent APIs
      this.activateScriptsByPreferences(preferences);
      this.updateTCFConsentIfAvailable(preferences);
      this.updateGoogleConsentMode(preferences);
    },

    // Update TCF consent if available
    updateTCFConsentIfAvailable(preferences) {
      if (window.__tcfapi) {
        window.__tcfapi('setConsent', 2, () => {}, {
          'purpose': {
            '1': preferences.necessary,
            '2': preferences.marketing,
            '3': preferences.marketing,
            '4': preferences.marketing,
            '5': preferences.preferences,
            '6': preferences.preferences,
            '7': preferences.statistics,
            '8': preferences.statistics,
            '9': preferences.statistics,
            '10': preferences.preferences
          }
        });
      }
    },

    // Disable non-consented scripts initially
    disableNonConsentedScripts() {
      const scripts = DOMUtils.getElements('script[script-type]', false);

      scripts.forEach(script => {
        const scriptTypeAttr = script.getAttribute('script-type').trim();
        const isForced = scriptTypeAttr.startsWith('!');
        const category = isForced ? scriptTypeAttr.substring(1).toLowerCase() :
          scriptTypeAttr.toLowerCase();

        // Skip necessary and forced scripts
        if (category === 'necessary' || isForced) return;

        // Create placeholder and replace original script
        const placeholder = this.createScriptPlaceholder(script, scriptTypeAttr);
        script.parentNode.replaceChild(placeholder, script);
      });
    },

    // Create a script placeholder from an active script
    createScriptPlaceholder(script, scriptTypeAttr) {
      const placeholder = document.createElement('script');
      placeholder.type = 'text/plain';
      placeholder.setAttribute('script-type', scriptTypeAttr);
      placeholder.setAttribute('data-original-type', script.type || 'application/javascript');

      if (script.src) placeholder.setAttribute('data-src', script.src);
      if (script.id) placeholder.id = script.id;
      if (script.async) placeholder.setAttribute('data-async', 'true');
      if (script.defer) placeholder.setAttribute('data-defer', 'true');

      placeholder.textContent = script.innerHTML;

      return placeholder;
    },

    // Activate scripts based on consent preferences
    activateScriptsByPreferences(preferences) {
      // Always activate necessary scripts
      this.activateScriptsForCategory('necessary');

      // Activate other categories based on preferences
      if (preferences.preferences) this.activateScriptsForCategory('preferences');
      if (preferences.statistics) this.activateScriptsForCategory('statistics');
      if (preferences.marketing) this.activateScriptsForCategory('marketing');
    },

    // Activate scripts for a specific category
    activateScriptsForCategory(category) {
      const normalizedCategory = category.trim().toLowerCase();
      const placeholders = DOMUtils.getElements('script[type="text/plain"][script-type]',
      false);

      let activatedCount = 0;

      placeholders.forEach(placeholder => {
        const scriptTypeAttr = placeholder.getAttribute('script-type').trim();
        const isForced = scriptTypeAttr.startsWith('!');
        const placeholderCategory = isForced ?
          scriptTypeAttr.substring(1).toLowerCase() :
          scriptTypeAttr.toLowerCase();

        // Activate if category matches
        if (placeholderCategory === normalizedCategory) {
          const script = this.createActiveScriptFromPlaceholder(placeholder);
          placeholder.parentNode.replaceChild(script, placeholder);
          activatedCount++;
        }
      });
    },

    // Collect scripts by category for display in preferences panel
    getScriptsByCategory() {
      const categories = {
        necessary: [],
        preferences: [],
        statistics: [],
        marketing: []
      };

      // Collect all scripts with script-type attribute
      const allScripts = [
        ...DOMUtils.getElements('script[script-type]', false),
        ...DOMUtils.getElements('script[type="text/plain"][script-type]', false)
      ];

      // Process each script
      allScripts.forEach(script => {
        const rawCategory = script.getAttribute('script-type');
        if (!rawCategory) return;

        // Handle forced scripts (with ! prefix)
        let category = rawCategory.trim().toLowerCase();
        if (category.startsWith('!')) {
          category = category.substring(1);
        }

        // Only process known categories
        if (categories.hasOwnProperty(category)) {
          const scriptId = script.id || '';
          const scriptSrc = script.src || script.getAttribute('data-src') ||
          'Inline script';

          // Check for duplicates
          const exists = categories[category].some(existingScript =>
            (existingScript.id === scriptId && scriptId !== '') ||
            (existingScript.src === scriptSrc && scriptSrc !== 'Inline script')
          );

          if (!exists) {
            categories[category].push({
              src: scriptSrc,
              id: scriptId || 'No ID'
            });
          }
        }
      });

      return categories;
    },

    // Initialize GTM consent based on saved preferences
    initializeGTMConsent() {
      const savedPreferences = localStorage.getItem('cookieConsent') ?
        JSON.parse(localStorage.getItem('cookieConsent')) :
        {
          necessary: true,
          preferences: false,
          statistics: false,
          marketing: false
        };

      // Push initial consent state to GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'default_consent',
        'consent_status': this.buildConsentStatusObject(savedPreferences)
      });
    },

    // Build consent status object for GTM/dataLayer
    buildConsentStatusObject(preferences) {
      return {
        'ad_storage': preferences.marketing ? 'granted' : 'denied',
        'analytics_storage': preferences.statistics ? 'granted' : 'denied',
        'functionality_storage': preferences.preferences ? 'granted' : 'denied',
        'personalization_storage': preferences.preferences ? 'granted' : 'denied',
        'security_storage': 'granted',
        'ad_user_data': preferences.marketing ? 'granted' : 'denied',
        'ad_personalization': preferences.marketing ? 'granted' : 'denied',
        'region': this.isEU ? 'gdpr' : 'other'
      };
    },

    // Update Google Consent Mode with current preferences
    updateGoogleConsentMode(preferences) {
      // Update Google's Consent Mode v2
      gtag('consent', 'update', {
        'ad_storage': preferences.marketing ? 'granted' : 'denied',
        'analytics_storage': preferences.statistics ? 'granted' : 'denied',
        'functionality_storage': preferences.preferences ? 'granted' : 'denied',
        'personalization_storage': preferences.preferences ? 'granted' : 'denied',
        'security_storage': 'granted', // Always granted as essential
        'ad_user_data': preferences.marketing ? 'granted' : 'denied',
        'ad_personalization': preferences.marketing ? 'granted' : 'denied',
        'ad_personalization_interaction': preferences.marketing ? 'granted' : 'denied',
        'ad_user_data_interaction': preferences.marketing ? 'granted' : 'denied'
      });

      // Region-specific settings for EU/GDPR
      if (this.isEU) {
        gtag('set', 'ads_data_redaction', !preferences.marketing);
        gtag('set', 'url_passthrough', preferences.marketing);
      }

      // Trigger dataLayer event
      window.dataLayer.push({
        'event': 'consent_updated',
        'consent_preferences': preferences,
        'consent_status': this.buildConsentStatusObject(preferences)
      });
    }
  };

  // Public actions that can be called from event handlers
  window.CookieConsentActions = {
    acceptAll() {
      ConsentManager.setConsent({
        necessary: true,
        preferences: true,
        statistics: true,
        marketing: true
      });
      ConsentManager.hideBanner();
    },

    rejectAll() {
      ConsentManager.setConsent({
        necessary: true,
        preferences: false,
        statistics: false,
        marketing: false
      });
      ConsentManager.hideBanner();
    },

    showPreferences() {
      ConsentManager.showPreferencesPanel();
    },

    hidePreferences() {
      ConsentManager.hidePreferencesPanel();

      // Remove is-active class from save-preferences buttons in horizontal banners
      const horizontalBanner = DOMUtils.getElements('[data-consent-banner="horizontal"]',
        false)[0];
      if (horizontalBanner) {
        DOMUtils.getElements('[data-consent-action="save-preferences"]', false,
            horizontalBanner)
          .forEach(saveBtn => {
            saveBtn.classList.remove('is-active');
          });
      }
    },

    savePreferences() {
      // Collect checked state for each category
      const getCheckedState = category => {
        let isChecked = false;
        DOMUtils.getElements(`[data-consent-checkbox="${category}"]`, false)
          .forEach(checkbox => {
            if (checkbox.checked) isChecked = true;
          });
        return isChecked;
      };

      const preferences = {
        necessary: true, // Always required
        preferences: getCheckedState('preferences'),
        statistics: getCheckedState('statistics'),
        marketing: getCheckedState('marketing')
      };

      ConsentManager.setConsent(preferences);
      ConsentManager.hidePreferencesPanel();
      ConsentManager.hideBanner();
    },

    acceptAllAndClose() {
      ConsentManager.setConsent({
        necessary: true,
        preferences: true,
        statistics: true,
        marketing: true
      });
      ConsentManager.hidePreferencesPanel();
      ConsentManager.hideBanner();
    }
  };

  // Initialize the consent manager when DOM is ready
  onDOMReady(() => {
    ConsentManager.init();
    // Make ConsentManager available globally
    window.ConsentManager = ConsentManager;
  });
})();
