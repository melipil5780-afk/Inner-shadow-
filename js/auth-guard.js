// ================================================================
// WELLOVIE — AUTH GUARD
// js/auth-guard.js
//
// Add this as the FIRST script tag on every protected page:
// <script src="/js/utils.js"></script>
// <script src="/js/auth-guard.js"></script>
//
// Replaces all Supabase session checks and requireAuth() calls.
// ================================================================

(function () {
  // If not unlocked, send to sales page immediately
  if (!localStorage.getItem('wellovie_license')) {
    window.location.replace('/index.html#unlock');
  }
})();
