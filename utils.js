// ================================================================
// INNERSHADOW — SHARED UTILITIES
// js/utils.js
//
// Import after supabase-client.js on every page.
// Pure functions — no side effects, no dependencies.
// ================================================================


// ================================================================
// SECTION 1 — UI UTILITIES
// ================================================================

const UI = {

  // ── Loading overlay ────────────────────────────────────

  _loadTimer: null,

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text    = document.getElementById('loadingText');
    if (!overlay) return;
    if (text) text.textContent = message;
    overlay.classList.add('loading-overlay--show');
    // Safety timeout — never block the UI forever
    if (this._loadTimer) clearTimeout(this._loadTimer);
    this._loadTimer = setTimeout(() => this.hideLoading(), 15000);
  },

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.classList.remove('loading-overlay--show');
    if (this._loadTimer) {
      clearTimeout(this._loadTimer);
      this._loadTimer = null;
    }
  },

  // ── Toast notifications ────────────────────────────────

  _toastTimer: null,

  showToast(message, type = 'default', duration = 2500) {
    let toast = document.getElementById('appToast');

    // Create if doesn't exist
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    // Clear existing
    if (this._toastTimer) clearTimeout(this._toastTimer);
    toast.classList.remove('toast--show', 'toast--error', 'toast--success');

    toast.textContent = message;
    if (type === 'error')   toast.classList.add('toast--error');
    if (type === 'success') toast.classList.add('toast--success');

    // Force reflow so transition fires
    toast.offsetHeight;
    toast.classList.add('toast--show');

    this._toastTimer = setTimeout(() => {
      toast.classList.remove('toast--show');
    }, duration);
  },

  showSuccess(message, duration = 2500) {
    this.showToast(message, 'success', duration);
  },

  showError(message, duration = 3500) {
    this.showToast(message, 'error', duration);
  },

  // ── Inline error/success messages ─────────────────────

  showInlineError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('error-message--show');
    setTimeout(() => el.classList.remove('error-message--show'), 5000);
  },

  hideInlineError(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('error-message--show');
  },

  // ── Scroll to top ──────────────────────────────────────

  scrollToTop(smooth = false) {
    const main = document.querySelector('.app-main');
    if (main) {
      main.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
    }
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
  },

  // ── Prevent iOS keyboard layout shift ─────────────────

  fixIOSKeyboard() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(el => {
      el.addEventListener('blur', () => {
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
        }, 100);
      });
    });
  },

  // ── Set dynamic viewport height on iOS ────────────────

  setIOSViewportHeight() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
  },

  // ── Body loaded state ──────────────────────────────────

  markLoaded(delay = 80) {
    setTimeout(() => document.body.classList.add('loaded'), delay);
  },

  // ── Character counter ──────────────────────────────────

  bindCharCounter(inputId, counterId, minChars = 0) {
    const input   = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;

    const update = () => {
      const len = input.value.length;
      counter.textContent = minChars > 0
        ? `${len} characters${len < minChars ? ` (min ${minChars})` : ''}`
        : `${len} characters`;

      if (minChars > 0 && len >= minChars) {
        counter.classList.add('char-counter--active');
      } else {
        counter.classList.remove('char-counter--active');
      }
    };

    input.addEventListener('input', update);
    update(); // Run immediately
  },

  // ── Checkbox toggle ────────────────────────────────────

  bindCheckboxLabels(containerSelector = '.checkbox-grid') {
    const containers = document.querySelectorAll(containerSelector);
    containers.forEach(container => {
      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const label = cb.closest('.checkbox-label');
        if (!label) return;

        cb.addEventListener('change', () => {
          label.classList.toggle('checkbox-label--checked', cb.checked);
        });

        // Restore checked state if already checked
        if (cb.checked) label.classList.add('checkbox-label--checked');
      });
    });
  },

  // ── Button loading state ───────────────────────────────

  setButtonLoading(btnId, loading, originalText = null) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Loading...';
      btn.disabled = true;
    } else {
      btn.textContent = originalText || btn.dataset.originalText || btn.textContent;
      btn.disabled = false;
    }
  },

  // ── Confetti celebration ───────────────────────────────

  celebrate(options = {}) {
    if (typeof confetti !== 'function') return;
    confetti({
      particleCount: options.count   || 80,
      spread:        options.spread  || 60,
      origin:        options.origin  || { y: 0.7 },
      colors:        options.colors  || ['#0d9488', '#d97706', '#5eead4', '#fbbf24'],
      gravity:       options.gravity || 0.9
    });
  }
};


// ================================================================
// SECTION 2 — NAVIGATION
// ================================================================

const Nav = {

  // Navigate with loading state
  go(url, loadingMessage = 'Loading...') {
    UI.showLoading(loadingMessage);
    setTimeout(() => { window.location.href = url; }, 200);
  },

  // Go back safely
  back(fallback = '/app.html') {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = fallback;
    }
  },

  // Get URL param
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // Get all URL params as object
  getParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      params[k] = v;
    });
    return params;
  },

  // Set tab in app shell — used by bottom nav
  setTab(tabName) {
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url);
  },

  // Get current tab from URL
  getCurrentTab(defaultTab = 'today') {
    return this.getParam('tab') || defaultTab;
  }
};


// ================================================================
// SECTION 3 — DATE AND TIME
// ================================================================

const DateTime = {

  // Today as YYYY-MM-DD
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  // Format date for display
  formatDate(dateStr, style = 'medium') {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const styles = {
      short:  { month: 'short', day: 'numeric' },
      medium: { month: 'long',  day: 'numeric', year: 'numeric' },
      long:   { weekday: 'long', month: 'long', day: 'numeric' },
      day:    { weekday: 'long' }
    };
    return date.toLocaleDateString('en-US', styles[style] || styles.medium);
  },

  // Time ago string
  timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return this.formatDate(dateStr, 'short');
  },

  // Is today
  isToday(dateStr) {
    return dateStr === this.today();
  },

  // Was yesterday
  isYesterday(dateStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().slice(0, 10);
  },

  // Days since a date
  daysSince(dateStr) {
    if (!dateStr) return null;
    const then = new Date(dateStr + 'T00:00:00');
    const now  = new Date();
    return Math.floor((now - then) / 86400000);
  },

  // Greeting based on time of day
  greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }
};


// ================================================================
// SECTION 4 — LOCAL STATE CACHE
// Syncs with Supabase but serves from cache for instant load
// ================================================================

const Cache = {

  KEY: 'innershadow_state_cache',
  TTL: 5 * 60 * 1000, // 5 minutes

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        data,
        savedAt: Date.now()
      }));
    } catch (err) {
      console.warn('[Cache] save failed:', err);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      // Return null if expired
      if (Date.now() - savedAt > this.TTL) return null;
      return data;
    } catch (err) {
      console.warn('[Cache] load failed:', err);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  isValid() {
    return this.load() !== null;
  },

  // Update a specific key without invalidating everything
  patch(key, value) {
    const current = this.load();
    if (!current) return;
    current[key] = value;
    this.save(current);
  }
};


// ================================================================
// SECTION 5 — VALIDATION
// ================================================================

const Validate = {

  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  password(password) {
    return {
      valid:         password.length >= 8,
      hasLength:     password.length >= 8,
      hasUppercase:  /[A-Z]/.test(password),
      hasLowercase:  /[a-z]/.test(password),
      hasNumber:     /[0-9]/.test(password)
    };
  },

  minLength(text, min) {
    return (text || '').trim().length >= min;
  },

  notEmpty(text) {
    return (text || '').trim().length > 0;
  }
};


// ================================================================
// SECTION 6 — DEVICE DETECTION
// ================================================================

const Device = {

  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,

  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

  isStandalone: window.navigator.standalone === true ||
                window.matchMedia('(display-mode: standalone)').matches,

  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
              .test(navigator.userAgent),

  hasNotifications: 'Notification' in window,

  hasServiceWorker: 'serviceWorker' in navigator,

  // Trigger Add to Home Screen prompt if available
  _deferredPrompt: null,

  initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this._deferredPrompt = e;
    });
  },

  async showInstallPrompt() {
    if (!this._deferredPrompt) return false;
    this._deferredPrompt.prompt();
    const { outcome } = await this._deferredPrompt.userChoice;
    this._deferredPrompt = null;
    return outcome === 'accepted';
  },

  canInstall() {
    return !!this._deferredPrompt;
  }
};


// ================================================================
// SECTION 7 — ASSESSMENT ROUTING
// ================================================================

const Assessment = {

  // Route Q1 answer to primary pathway
  getPathway(q1Answer) {
    const map = {
      'emotions':   'emotional',
      'identity':   'identity',
      'connection': 'connection',
      'heavy':      'living',
      'growth':     'identity'
    };
    return map[q1Answer] || 'emotional';
  },

  // Override routing for high intensity — always start with emotional
  getRoutedPathway(q1Answer, q3Answer) {
    if (q3Answer === 'very-difficult') return 'emotional';
    return this.getPathway(q1Answer);
  },

  // Determine experience level from Q4
  getExperienceLevel(q4Answer) {
    const experienced = ['therapy-helped', 'therapy-didnt-fit'];
    const some        = ['tried-own'];
    if (experienced.includes(q4Answer)) return 'experienced';
    if (some.includes(q4Answer))        return 'some';
    return 'new';
  },

  // Determine intensity level from Q3
  getIntensityLevel(q3Answer) {
    const map = {
      'background':     'low',
      'getting-harder': 'medium',
      'very-difficult': 'high',
      'mostly-okay':    'low'
    };
    return map[q3Answer] || 'medium';
  },

  // Generate the personalized reflection paragraph
  // Shown at end of assessment — the "you've been seen" moment
  generateReflection(answers) {
    const { q1, q2, q3, q5 } = answers;

    // High distress — always acknowledge first
    if (q3 === 'very-difficult') {
      return `You came here in a hard moment. That takes something. What you're going through is real — and the fact that you're looking for tools to work with it, rather than just waiting for it to pass, matters. InnerShadow isn't therapy and it isn't a crisis line. But it is a place to learn specific, evidence-based skills for exactly what you're describing. Start small. One module. One skill. That's enough for today.`;
    }

    // Emotion-based entry
    if (q1 === 'emotions') {
      if (q2 === 'self-critical') {
        return `You've been carrying a weight that most people don't see. Not a dramatic crisis — something quieter and more persistent. A voice inside that holds you to a standard nobody else would be held to. You've probably tried to figure this out on your own. You haven't stopped looking. That matters. What you're describing has a name and it has a path forward. You're not broken. You're someone who never learned the specific skills for this — and that's exactly what we're here for.`;
      }
      if (q2 === 'anxious') {
        return `There's a part of your mind that never quite switches off. Always scanning — for what might go wrong, for what you might have done wrong, for what might be about to change. That kind of vigilance is exhausting. And the cruelest part is it doesn't feel like a choice. It feels like just how you are. It isn't. It's a learned response — and learned responses can be worked with, once you understand what's driving them.`;
      }
      if (q2 === 'numb') {
        return `Going numb is one of the least-talked-about ways of struggling. It doesn't look dramatic. It doesn't ask for help. It just quietly removes you from your own life until you're watching yourself from a distance. You noticed it. That's not nothing — most people just wait for it to pass. You're here because you want something different. That's exactly where this starts.`;
      }
      if (q2 === 'reactions') {
        return `You know the pattern. You react in a way you didn't intend, and then you spend time afterward wondering why you can't seem to stop it. The reactions feel involuntary — because they are. They're not character flaws. They're responses your nervous system learned, and they can be unlearned once you understand the mechanism behind them. That's what this is designed to teach you.`;
      }
    }

    // Identity-based entry
    if (q1 === 'identity' || q1 === 'growth') {
      return `Most people spend their entire lives inside inherited stories, unchosen values, and unexamined assumptions about what they're supposed to want. The fact that you're here — asking the harder question of who you actually are and what you actually want — is rarer than it sounds. InnerShadow is designed for exactly this. Not abstract self-help, but specific, honest tools for understanding yourself more clearly. That clarity changes everything downstream.`;
    }

    // Connection-based entry
    if (q1 === 'connection') {
      return `You can be surrounded by people and still feel completely alone. You can love someone and still feel unseen by them. What you're describing isn't a social failure — it's a skills gap. The specific skills for genuine closeness, honest communication, and navigating the vulnerability that connection requires are learnable. Nobody is born knowing them. Most people never get taught. That's what this pathway is for.`;
    }

    // Heavy/can't explain entry
    if (q1 === 'heavy') {
      return `There's a particular kind of difficulty that doesn't have a dramatic name. Life is working, technically — but something essential feels absent. Like you're going through the motions of a life that doesn't quite feel like yours. That feeling is real, it's more common than people admit, and it has a path forward. It starts with understanding what a good life actually means for you specifically — not in the abstract, but in the particular texture of your days. That's what we're going to explore.`;
    }

    // Default
    return `You came here because something isn't quite right — maybe you can't name it exactly, maybe you just know that the way things are isn't the way you want them to be. That honest recognition is rarer than it sounds. Most people spend years avoiding it. You didn't. What you're describing isn't permanent and it isn't a character flaw. It's a gap — between where you are and where you could be — and that gap is exactly what InnerShadow is designed to close.`;
  }
};


// ================================================================
// SECTION 8 — MOOD UTILITIES
// ================================================================

const Mood = {

  MOODS: [
    { id: 'rough',   emoji: '😞', label: 'Rough'   },
    { id: 'anxious', emoji: '😰', label: 'Anxious' },
    { id: 'okay',    emoji: '😐', label: 'Okay'    },
    { id: 'good',    emoji: '🙂', label: 'Good'    },
    { id: 'great',   emoji: '😊', label: 'Great'   }
  ],

  getEmoji(moodId) {
    return this.MOODS.find(m => m.id === moodId)?.emoji || '😐';
  },

  getLabel(moodId) {
    return this.MOODS.find(m => m.id === moodId)?.label || 'Okay';
  },

  // Contextual message after check-in
  getCheckinMessage(moodId, streakCount, hasUnlockedTools) {
    const messages = {
      rough: hasUnlockedTools
        ? 'Hard days happen. You have tools for this now.'
        : 'Hard days are real. You showed up anyway — that counts.',
      anxious: hasUnlockedTools
        ? 'Anxiety is information. You\'ve learned how to work with it.'
        : 'You noticed it. That\'s the first step.',
      okay: streakCount > 7
        ? `${streakCount} days in a row. That\'s not nothing.`
        : 'Okay is a valid place to be.',
      good:  'Good energy is worth investing. Keep that momentum.',
      great: 'Something is working. Notice it — you can return to this.'
    };
    return messages[moodId] || 'You showed up. That matters.';
  },

  // Which tools to suggest based on mood
  // Returns ordered list — first unlocked tool wins
  getToolSuggestions(moodId) {
    const map = {
      rough:   ['tool-self-compassion-pause', 'tool-regulation-sequence', 'tool-name-it'],
      anxious: ['tool-regulation-sequence', 'tool-body-check', 'tool-event-vs-story'],
      okay:    ['tool-alive-inventory', 'tool-values-compass', 'tool-name-it'],
      good:    ['tool-meaning-reframe', 'tool-design-tomorrow', 'tool-weekly-review'],
      great:   ['tool-weekly-review', 'tool-relationship-inventory', 'tool-quarterly-audit']
    };
    return map[moodId] || [];
  }
};


// ================================================================
// SECTION 9 — STREAK UTILITIES
// ================================================================

const Streak = {

  getMessage(count) {
    if (count === 0)  return 'Start your streak today';
    if (count === 1)  return 'Day 1. The hardest one.';
    if (count < 7)    return `${count} days. Keep going.`;
    if (count === 7)  return '7 days. One full week.';
    if (count < 14)   return `${count} days. You\'re building something.`;
    if (count === 14) return '14 days. Two weeks straight.';
    if (count < 30)   return `${count} days. This is becoming a habit.`;
    if (count === 30) return '30 days. One month. That\'s real.';
    return `${count} days. Remarkable.`;
  },

  getIcon(count) {
    if (count === 0)  return '○';
    if (count < 3)    return '🔥';
    if (count < 7)    return '🔥';
    if (count < 30)   return '🔥';
    return '⚡';
  }
};


// ================================================================
// SECTION 10 — STRING UTILITIES
// ================================================================

const Str = {

  // Truncate with ellipsis
  truncate(str, maxLen = 100) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen).trimEnd() + '...';
  },

  // Capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Escape HTML for safe insertion
  escape(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Plural helper
  plural(count, singular, plural) {
    return count === 1 ? singular : (plural || singular + 's');
  }
};


// ================================================================
// EXPORT — everything on window for page access
// ================================================================

window.UI         = UI;
window.Nav        = Nav;
window.DateTime   = DateTime;
window.Cache      = Cache;
window.Validate   = Validate;
window.Device     = Device;
window.Assessment = Assessment;
window.Mood       = Mood;
window.Streak     = Streak;
window.Str        = Str;

// Initialize device detection
Device.initInstallPrompt();

// Fix iOS viewport height
if (Device.isIOS) UI.setIOSViewportHeight();

console.log('[InnerShadow] Utils ready');
