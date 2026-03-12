// ================================================================
// WELLOVIE  SHARED UTILITIES
// js/utils.js
// Pure functions — no side effects, no dependencies.
// ================================================================


// ================================================================
// SECTION 1  UI UTILITIES
// ================================================================

const UI = {

  _loadTimer: null,

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text    = document.getElementById('loadingText');
    if (!overlay) return;
    if (text) text.textContent = message;
    overlay.classList.add('loading-overlay--show');
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

  _toastTimer: null,

  showToast(message, type = 'default', duration = 2500) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    if (this._toastTimer) clearTimeout(this._toastTimer);
    toast.classList.remove('toast--show', 'toast--error', 'toast--success');
    toast.textContent = message;
    if (type === 'error')   toast.classList.add('toast--error');
    if (type === 'success') toast.classList.add('toast--success');
    toast.offsetHeight;
    toast.classList.add('toast--show');
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('toast--show');
    }, duration);
  },

  showSuccess(message, duration = 2500) { this.showToast(message, 'success', duration); },
  showError(message, duration = 3500)   { this.showToast(message, 'error', duration); },

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

  scrollToTop(smooth = false) {
    const main = document.querySelector('.app-main');
    if (main) main.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
  },

  fixIOSKeyboard() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(el => {
      el.addEventListener('blur', () => {
        setTimeout(() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }, 100);
      });
    });
  },

  setIOSViewportHeight() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
  },

  markLoaded(delay = 80) {
    setTimeout(() => document.body.classList.add('loaded'), delay);
  },

  bindCharCounter(inputId, counterId, minChars = 0) {
    const input   = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;
    const update = () => {
      const len = input.value.length;
      counter.textContent = minChars > 0
        ? `${len} characters${len < minChars ? ` (min ${minChars})` : ''}`
        : `${len} characters`;
      if (minChars > 0 && len >= minChars) counter.classList.add('char-counter--active');
      else counter.classList.remove('char-counter--active');
    };
    input.addEventListener('input', update);
    update();
  },

  bindCheckboxLabels(containerSelector = '.checkbox-grid') {
    document.querySelectorAll(containerSelector).forEach(container => {
      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const label = cb.closest('.checkbox-label');
        if (!label) return;
        cb.addEventListener('change', () => {
          label.classList.toggle('checkbox-label--checked', cb.checked);
        });
        if (cb.checked) label.classList.add('checkbox-label--checked');
      });
    });
  },

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
// SECTION 2  NAVIGATION
// ================================================================

const Nav = {

  go(url, loadingMessage = 'Loading...') {
    UI.showLoading(loadingMessage);
    setTimeout(() => { window.location.href = url; }, 200);
  },

  back(fallback = '/course.html') {
    window.location.href = fallback;
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  getParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });
    return params;
  },

  setTab(tabName) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url);
  },

  getCurrentTab(defaultTab = 'today') {
    return this.getParam('tab') || defaultTab;
  }
};


// ================================================================
// SECTION 3  DATE AND TIME
// ================================================================

const DateTime = {

  today() { return new Date().toISOString().slice(0, 10); },

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

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return this.formatDate(dateStr, 'short');
  },

  isToday(dateStr)     { return dateStr === this.today(); },

  isYesterday(dateStr) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return dateStr === y.toISOString().slice(0, 10);
  },

  daysSince(dateStr) {
    if (!dateStr) return null;
    return Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 86400000);
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }
};


// ================================================================
// SECTION 4  LOCAL STATE CACHE
// ================================================================

const Cache = {

  KEY: 'wellovie_state_cache',
  TTL: 5 * 60 * 1000,

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ data, savedAt: Date.now() }));
    } catch (err) { console.warn('[Cache] save failed:', err); }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt > this.TTL) return null;
      return data;
    } catch (err) { console.warn('[Cache] load failed:', err); return null; }
  },

  clear()   { localStorage.removeItem(this.KEY); },
  isValid() { return this.load() !== null; },

  patch(key, value) {
    const current = this.load();
    if (!current) return;
    current[key] = value;
    this.save(current);
  }
};


// ================================================================
// SECTION 5  VALIDATION
// ================================================================

const Validate = {
  minLength(text, min) { return (text || '').trim().length >= min; },
  notEmpty(text)       { return (text || '').trim().length > 0; }
};


// ================================================================
// SECTION 6  DEVICE DETECTION
// ================================================================

const Device = {

  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isStandalone: false,
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  hasNotifications: 'Notification' in window,
  hasServiceWorker: 'serviceWorker' in navigator,
  canInstall() { return false; }
};


// ================================================================
// SECTION 7  ASSESSMENT ROUTING
// ================================================================

const Assessment = {

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

  getRoutedPathway(q1Answer, q3Answer) {
    if (q3Answer === 'very-difficult') return 'emotional';
    return this.getPathway(q1Answer);
  },

  getExperienceLevel(q4Answer) {
    const experienced = ['therapy-helped', 'therapy-didnt-fit'];
    const some        = ['tried-own'];
    if (experienced.includes(q4Answer)) return 'experienced';
    if (some.includes(q4Answer))        return 'some';
    return 'new';
  },

  getIntensityLevel(q3Answer) {
    const map = {
      'background':     'low',
      'getting-harder': 'medium',
      'very-difficult': 'high',
      'mostly-okay':    'low'
    };
    return map[q3Answer] || 'medium';
  },

  generateReflection(answers) {
    const { q1, q2, q3 } = answers;

    if (q3 === 'very-difficult') {
      return `You came here in a hard moment. That takes something. What you're going through is real — and the fact that you're looking for tools to work with it, rather than just waiting for it to pass, matters. Wellovie isn't therapy and it isn't a crisis line. But it is a place to learn specific, evidence-based skills for exactly what you're describing. Start small. One module. One skill. That's enough for today.`;
    }

    if (q1 === 'emotions') {
      if (q2 === 'self-critical') return `You've been carrying a weight that most people don't see. Not a dramatic crisis — something quieter and more persistent. A voice inside that holds you to a standard nobody else would be held to. You've probably tried to figure this out on your own. You haven't stopped looking. That matters. What you're describing has a name and it has a path forward. You're not broken. You're someone who never learned the specific skills for this — and that's exactly what we're here for.`;
      if (q2 === 'anxious')      return `There's a part of your mind that never quite switches off. Always scanning — for what might go wrong, for what you might have done wrong, for what might be about to change. That kind of vigilance is exhausting. And the cruelest part is it doesn't feel like a choice. It feels like just how you are. It isn't. It's a learned response — and learned responses can be worked with, once you understand what's driving them.`;
      if (q2 === 'numb')         return `Going numb is one of the least-talked-about ways of struggling. It doesn't look dramatic. It doesn't ask for help. It just quietly removes you from your own life until you're watching yourself from a distance. You noticed it. That's not nothing — most people just wait for it to pass. You're here because you want something different. That's exactly where this starts.`;
      if (q2 === 'reactions')    return `You know the pattern. You react in a way you didn't intend, and then you spend time afterward wondering why you can't seem to stop it. The reactions feel involuntary — because they are. They're not character flaws. They're responses your nervous system learned, and they can be unlearned once you understand the mechanism behind them. That's what this is designed to teach you.`;
    }

    if (q1 === 'identity' || q1 === 'growth') {
      return `Most people spend their entire lives inside inherited stories, unchosen values, and unexamined assumptions about what they're supposed to want. The fact that you're here — asking the harder question of who you actually are and what you actually want — is rarer than it sounds. Wellovie is designed for exactly this. Not abstract self-help, but specific, honest tools for understanding yourself more clearly. That clarity changes everything downstream.`;
    }

    if (q1 === 'connection') {
      return `You can be surrounded by people and still feel completely alone. You can love someone and still feel unseen by them. What you're describing isn't a social failure — it's a skills gap. The specific skills for genuine closeness, honest communication, and navigating the vulnerability that connection requires are learnable. Nobody is born knowing them. Most people never get taught. That's what this pathway is for.`;
    }

    if (q1 === 'heavy') {
      return `There's a particular kind of difficulty that doesn't have a dramatic name. Life is working, technically — but something essential feels absent. Like you're going through the motions of a life that doesn't quite feel like yours. That feeling is real, it's more common than people admit, and it has a path forward. It starts with understanding what a good life actually means for you specifically — not in the abstract, but in the particular texture of your days. That's what we're going to explore.`;
    }

    return `You came here because something isn't quite right — maybe you can't name it exactly, maybe you just know that the way things are isn't the way you want them to be. That honest recognition is rarer than it sounds. Most people spend years avoiding it. You didn't. What you're describing isn't permanent and it isn't a character flaw. It's a gap — between where you are and where you could be — and that gap is exactly what Wellovie is designed to close.`;
  }
};


// ================================================================
// SECTION 8  MOOD UTILITIES
// ================================================================

const Mood = {

  MOODS: [
    { id: 'rough',   emoji: '😞', label: 'Rough'   },
    { id: 'anxious', emoji: '😰', label: 'Anxious' },
    { id: 'okay',    emoji: '😐', label: 'Okay'    },
    { id: 'good',    emoji: '🙂', label: 'Good'    },
    { id: 'great',   emoji: '😊', label: 'Great'   }
  ],

  getEmoji(moodId) { return this.MOODS.find(m => m.id === moodId)?.emoji || ''; },
  getLabel(moodId) { return this.MOODS.find(m => m.id === moodId)?.label || 'Okay'; },

  getCheckinMessage(moodId, streakCount, hasUnlockedTools) {
    const messages = {
      rough:   hasUnlockedTools ? 'Hard days happen. You have tools for this now.' : 'Hard days are real. You showed up anyway — that counts.',
      anxious: hasUnlockedTools ? 'Anxiety is information. You\'ve learned how to work with it.' : 'You noticed it. That\'s the first step.',
      okay:    streakCount > 7  ? `${streakCount} days in a row. That\'s not nothing.` : 'Okay is a valid place to be.',
      good:    'Good energy is worth investing. Keep that momentum.',
      great:   'Something is working. Notice it — you can return to this.'
    };
    return messages[moodId] || 'You showed up. That matters.';
  },

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
// SECTION 9  STREAK UTILITIES
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
    if (count === 0) return '🌑';
    if (count < 3)   return '🌒';
    if (count < 7)   return '🌓';
    if (count < 30)  return '🔥';
    return '⭐';
  }
};


// ================================================================
// SECTION 10  STRING UTILITIES
// ================================================================

const Str = {

  truncate(str, maxLen = 100) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen).trimEnd() + '...';
  },

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  escape(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  },

  plural(count, singular, plural) {
    return count === 1 ? singular : (plural || singular + 's');
  }
};


// ================================================================
// SECTION 11  LICENSE / ACCESS
// Replace all Supabase auth checks with License.isUnlocked()
// Replace all isPro() / checkPro() with License.isUnlocked()
// ================================================================

const License = {

  KEY:          'wellovie_license',
  CUSTOMER_KEY: 'wellovie_customer',

  // Called once when user enters their key
  // Validates against Cloudflare Worker → Lemon Squeezy
  async activate(licenseKey) {
    try {
      const res = await fetch('https://validate.wellovie.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() })
      });

      const data = await res.json();

      if (data.valid) {
        localStorage.setItem(this.KEY, licenseKey.trim());
        if (data.customerName) {
          localStorage.setItem(this.CUSTOMER_KEY, data.customerName);
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid license key' };
      }
    } catch (err) {
      console.error('[License] activate error:', err);
      return { success: false, error: 'Could not connect — check your internet and try again' };
    }
  },

  // Check if user has unlocked — replaces all auth checks
  isUnlocked() {
    return !!localStorage.getItem(this.KEY);
  },

  // Get stored key
  getKey() {
    return localStorage.getItem(this.KEY);
  },

  // Get customer name if stored
  getCustomerName() {
    return localStorage.getItem(this.CUSTOMER_KEY) || '';
  },

  // Require unlock — redirect to sales page if not
  // Drop this at the top of course.html and every pathway page
  requireUnlock(redirectTo = '/index.html') {
    if (!this.isUnlocked()) {
      window.location.href = redirectTo;
    }
  },

  // Clear everything (used in settings if user wants to transfer to new device)
  clear() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem(this.CUSTOMER_KEY);
  }
};


// ================================================================
// EXPORTS
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
window.License    = License;

// Init
if (Device.isIOS) UI.setIOSViewportHeight();

