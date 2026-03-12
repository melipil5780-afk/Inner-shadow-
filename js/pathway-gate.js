// ================================================================
// WELLOVIE — PATHWAY GATE
// js/pathway-gate.js
//
// Replaces the "Modules 3–6 unlock with Wellovie Pro" paywall.
// Include on every pathway overview and module page.
// Works alongside auth-guard.js — if they're here, they've paid.
//
// USAGE: Add at bottom of each pathway file, before </body>:
// <script src="/js/utils.js"></script>
// <script src="/js/auth-guard.js"></script>   ← protects the page
// <script src="/js/pathway-gate.js"></script>  ← unlocks all modules
// ================================================================

(function () {

  // If they reached this page, they have a valid license.
  // Remove all lock overlays and "Upgrade to Pro" prompts.

  function unlockAll() {

    // Remove upgrade banners
    document.querySelectorAll(
      '.upgrade-banner, .pro-gate, .pro-overlay, .unlock-cta, [data-pro-gate]'
    ).forEach(el => el.remove());

    // Remove lock icons from module cards
    document.querySelectorAll('.module-lock, .lock-icon, [data-locked]').forEach(el => {
      el.remove();
    });

    // Un-disable locked module links
    document.querySelectorAll('.module-card--locked, [data-module-locked]').forEach(el => {
      el.classList.remove('module-card--locked');
      el.removeAttribute('data-module-locked');
      el.style.opacity = '';
      el.style.pointerEvents = '';
    });

    // Make all module links clickable
    document.querySelectorAll('a[data-requires-pro]').forEach(el => {
      el.removeAttribute('data-requires-pro');
    });

    // Replace any "Upgrade to Pro →" buttons with nothing
    document.querySelectorAll('a[href*="upgrade"], button[data-upgrade]').forEach(el => {
      // Only remove if it's specifically an upgrade CTA
      if (
        el.textContent.toLowerCase().includes('upgrade') ||
        el.textContent.toLowerCase().includes('unlock')
      ) {
        el.remove();
      }
    });

    // Show any pro-only content that was hidden
    document.querySelectorAll('[data-pro-content], .pro-content').forEach(el => {
      el.style.display = '';
      el.removeAttribute('hidden');
    });
  }

  // Run immediately and after DOM is ready
  unlockAll();
  document.addEventListener('DOMContentLoaded', unlockAll);

  // Also expose for manual calls if needed
  window.unlockAllModules = unlockAll;

})();
