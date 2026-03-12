// ================================================================
// WELLOVIE  LOCAL DB
// js/local-db.js
//
// Drop-in replacement for supabase-client.js.
// Implements the same DB and Auth API surface using localStorage.
// No Supabase. No network calls. No monthly bill.
//
// Replace every page's:
//   <script src="/js/supabase.min.js"></script>
//   <script src="/js/supabase-client.js"></script>
// With:
//   <script src="/js/local-db.js"></script>
// ================================================================


// ================================================================
// STORAGE HELPERS
// ================================================================

const _store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
      console.warn('[LocalDB] storage write failed:', e);
    }
  },
  remove(key) { localStorage.removeItem(key); }
};

const _KEYS = {
  userState:    'wellovie_user_state',
  modules:      (id) => `wellovie_module_${id}`,
  allModules:   'wellovie_all_modules',
  pathways:     'wellovie_all_pathways',
  answers:      (id) => `wellovie_answers_${id}`,
  checkins:     'wellovie_checkins',
  reflections:  'wellovie_reflections',
  commitments:  'wellovie_commitments',
};

// Fake local user — replaces Supabase session.user
const LOCAL_USER = {
  id:            'local',
  email:         '',
  created_at:    _store.get('wellovie_first_seen') || new Date().toISOString(),
  user_metadata: { full_name: License?.getCustomerName?.() || '' }
};

// ================================================================
// CONSTANTS (same as supabase-client.js)
// ================================================================

const MODULE_SEQUENCE = {
  'em-1': 'em-2', 'em-2': 'em-3', 'em-3': 'em-4',
  'em-4': 'em-5', 'em-5': 'em-6', 'em-6': null,
  'id-1': 'id-2', 'id-2': 'id-3', 'id-3': 'id-4',
  'id-4': 'id-5', 'id-5': 'id-6', 'id-6': null,
  'cn-1': 'cn-2', 'cn-2': 'cn-3', 'cn-3': 'cn-4',
  'cn-4': 'cn-5', 'cn-5': 'cn-6', 'cn-6': null,
  'lw-1': 'lw-2', 'lw-2': 'lw-3', 'lw-3': 'lw-4',
  'lw-4': 'lw-5', 'lw-5': 'lw-6', 'lw-6': null,
};

const MODULE_PATHWAY_MAP = {
  'em-1': 'emotional', 'em-2': 'emotional', 'em-3': 'emotional',
  'em-4': 'emotional', 'em-5': 'emotional', 'em-6': 'emotional',
  'id-1': 'identity',  'id-2': 'identity',  'id-3': 'identity',
  'id-4': 'identity',  'id-5': 'identity',  'id-6': 'identity',
  'cn-1': 'connection','cn-2': 'connection','cn-3': 'connection',
  'cn-4': 'connection','cn-5': 'connection','cn-6': 'connection',
  'lw-1': 'living',    'lw-2': 'living',    'lw-3': 'living',
  'lw-4': 'living',    'lw-5': 'living',    'lw-6': 'living',
};

const PATHWAY_MODULES = {
  emotional:  ['em-1','em-2','em-3','em-4','em-5','em-6'],
  identity:   ['id-1','id-2','id-3','id-4','id-5','id-6'],
  connection: ['cn-1','cn-2','cn-3','cn-4','cn-5','cn-6'],
  living:     ['lw-1','lw-2','lw-3','lw-4','lw-5','lw-6'],
};

const PATHWAY_SEQUENCE = {
  emotional: 'identity', identity: 'connection',
  connection: 'living',  living: null
};

const MODULE_TOOL_MAP = {
  'em-1': 'tool-name-it',
  'em-2': 'tool-body-check',
  'em-3': 'tool-event-vs-story',
  'em-4': 'tool-self-compassion-pause',
  'em-5': 'tool-catch-name-pause',
  'em-6': 'tool-regulation-sequence',
  'id-1': 'tool-inheritance-check',
  'id-2': 'tool-values-check',
  'id-3': 'tool-narrative-edit',
  'id-4': 'tool-happiness-audit',
  'id-5': 'tool-shadow-integration',
  'id-6': 'tool-authenticity-check',
  'cn-1': 'tool-depth-shift',
  'cn-2': 'tool-deep-listening',
  'cn-3': 'tool-honest-expression',
  'cn-4': 'tool-productive-conflict',
  'cn-5': 'tool-limit-setting',
  'cn-6': 'tool-relational-investment',
  'lw-1': 'tool-life-compass',
  'lw-2': 'tool-meaning-check',
  'lw-3': 'tool-enough-practice',
  'lw-4': 'tool-relational-inventory',
  'lw-5': 'tool-day-design',
  'lw-6': 'tool-living-deliberately',
};

// All modules are free — everyone who reaches a page has paid
const FREE_MODULES = new Set(Object.keys(MODULE_SEQUENCE));

// No developer bypass needed — everyone is unlocked
const DEVELOPER_EMAILS = new Set();


// ================================================================
// AUTH — replaces Supabase Auth
// ================================================================

const Auth = {

  // Returns a fake session if license is valid; otherwise redirects
  async requireAuth(redirectTo = '/index.html') {
    if (!localStorage.getItem('wellovie_license')) {
      window.location.replace(redirectTo + '#unlock');
      return null;
    }
    // Record first-seen date if not already set
    if (!_store.get('wellovie_first_seen')) {
      _store.set('wellovie_first_seen', new Date().toISOString());
    }
    // Update name in case it changed
    LOCAL_USER.created_at    = _store.get('wellovie_first_seen') || LOCAL_USER.created_at;
    LOCAL_USER.user_metadata = { full_name: localStorage.getItem('wellovie_customer') || '' };
    return { user: LOCAL_USER };
  },

  async signOut() {
    localStorage.removeItem('wellovie_license');
    localStorage.removeItem('wellovie_customer');
  },

  async getSession() {
    const key = localStorage.getItem('wellovie_license');
    if (!key) return { data: { session: null } };
    return { data: { session: { user: LOCAL_USER } } };
  }
};


// ================================================================
// DB — replaces Supabase DB
// ================================================================

const DB = {

  // ── User State ──────────────────────────────────────────────────

  async getUserState(_userId) {
    const defaults = {
      streak_current: 0,
      streak_longest: 0,
      tools_unlocked: [],
      is_pro: true,           // Everyone who licensed is "pro"
      routed_pathway: null,
    };
    const saved = _store.get(_KEYS.userState, {});
    return { data: { ...defaults, ...saved }, error: null };
  },

  async updateUserState(_userId, updates) {
    const current = _store.get(_KEYS.userState, {});
    const updated = { ...current, ...updates };
    _store.set(_KEYS.userState, updated);
    return { data: updated, error: null };
  },

  // ── Module Progress ─────────────────────────────────────────────

  async getOneModuleProgress(_userId, moduleId) {
    const all = _store.get(_KEYS.allModules, {});
    const data = all[moduleId] || {
      module_id:    moduleId,
      completed:    false,
      unlocked:     true,   // All modules unlocked for course buyers
      current_step: 1,
    };
    return { data, error: null };
  },

  async updateModuleProgress(_userId, moduleId, updates) {
    const all  = _store.get(_KEYS.allModules, {});
    const prev = all[moduleId] || { module_id: moduleId, unlocked: true };
    all[moduleId] = { ...prev, ...updates };
    _store.set(_KEYS.allModules, all);
    return { data: all[moduleId], error: null };
  },

  async getModuleProgress(_userId) {
    return { data: _store.get(_KEYS.allModules, {}), error: null };
  },

  async completeModule(_userId, moduleId) {
    const now = new Date().toISOString();
    const all = _store.get(_KEYS.allModules, {});

    // 1. Mark this module complete
    all[moduleId] = {
      ...(all[moduleId] || {}),
      module_id:    moduleId,
      completed:    true,
      completed_at: now,
      current_step: 99,
      unlocked:     true,
    };

    // 2. Unlock next module
    const nextModuleId = MODULE_SEQUENCE[moduleId];
    if (nextModuleId) {
      all[nextModuleId] = {
        ...(all[nextModuleId] || { module_id: nextModuleId }),
        unlocked: true,
      };
    }
    _store.set(_KEYS.allModules, all);

    // 3. Add tool to unlocked tools
    const toolId = MODULE_TOOL_MAP[moduleId];
    if (toolId) {
      const state = _store.get(_KEYS.userState, {});
      const tools = new Set(state.tools_unlocked || []);
      tools.add(toolId);
      state.tools_unlocked = Array.from(tools);
      _store.set(_KEYS.userState, state);
    }

    // 4. Check pathway completion
    const pathwayKey     = MODULE_PATHWAY_MAP[moduleId];
    const pathwayMods    = PATHWAY_MODULES[pathwayKey] || [];
    const allComplete    = pathwayMods.every(id => all[id]?.completed);

    const pathways = _store.get(_KEYS.pathways, {});
    if (allComplete) {
      pathways[pathwayKey] = { ...(pathways[pathwayKey] || {}), completed: true, completed_at: now };

      // Unlock next pathway's first module
      const nextPathway = PATHWAY_SEQUENCE[pathwayKey];
      if (nextPathway) {
        pathways[nextPathway] = { ...(pathways[nextPathway] || {}), unlocked: true };
        const firstMod = PATHWAY_MODULES[nextPathway][0];
        if (firstMod) {
          all[firstMod] = { ...(all[firstMod] || { module_id: firstMod }), unlocked: true };
          _store.set(_KEYS.allModules, all);
        }
      }
      _store.set(_KEYS.pathways, pathways);
    }

    return { error: null, pathwayComplete: allComplete };
  },

  // ── Pathway Progress ────────────────────────────────────────────

  async getPathwayProgress(_userId) {
    return { data: _store.get(_KEYS.pathways, {}), error: null };
  },

  // ── Worksheet Responses ──────────────────────────────────────────

  async getWorksheetResponses(_userId, moduleId) {
    const all = _store.get(_KEYS.answers(moduleId), {});
    // Convert to array format expected by engine: [{question_num, response}]
    const arr = Object.entries(all).map(([question_num, response]) => ({
      question_num: Number(question_num),
      response
    }));
    return { data: arr, error: null };
  },

  async saveWorksheetResponse(_userId, moduleId, questionNum, response) {
    const all = _store.get(_KEYS.answers(moduleId), {});
    all[questionNum] = response;
    _store.set(_KEYS.answers(moduleId), all);
    return { data: { question_num: questionNum, response }, error: null };
  },

  // ── Check-ins ───────────────────────────────────────────────────

  async saveCheckin(_userId, mood, note = '') {
    const today    = new Date().toISOString().slice(0, 10);
    const checkins = _store.get(_KEYS.checkins, {});
    checkins[today] = { date: today, mood, note, saved_at: new Date().toISOString() };
    _store.set(_KEYS.checkins, checkins);
    await this.recalculateStreak(_userId);
    return { data: checkins[today], error: null };
  },

  async getTodayCheckin(_userId) {
    const today    = new Date().toISOString().slice(0, 10);
    const checkins = _store.get(_KEYS.checkins, {});
    return { data: checkins[today] || null, error: null };
  },

  async getRecentCheckins(_userId, days = 30) {
    const checkins = _store.get(_KEYS.checkins, {});
    const since    = new Date();
    since.setDate(since.getDate() - days);
    const recent   = Object.values(checkins)
      .filter(c => new Date(c.date) >= since)
      .sort((a, b) => b.date.localeCompare(a.date));
    return { data: recent, error: null };
  },

  async recalculateStreak(_userId) {
    const checkins = _store.get(_KEYS.checkins, {});
    const dates    = Object.keys(checkins).sort((a, b) => b.localeCompare(a));
    if (!dates.length) { await this.updateUserState(_userId, { streak_current: 0 }); return; }

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i] + 'T00:00:00');
      const diff = Math.round((cursor - d) / 86400000);
      if (diff === 0 || diff === 1) { streak++; cursor = d; }
      else break;
    }

    const state   = _store.get(_KEYS.userState, {});
    const longest = Math.max(streak, state.streak_longest || 0);
    await this.updateUserState(_userId, { streak_current: streak, streak_longest: longest });
  },

  // ── Reflections ─────────────────────────────────────────────────

  async saveReflection(_userId, moduleId, text) {
    const all = _store.get(_KEYS.reflections, []);
    const idx = all.findIndex(r => r.module_id === moduleId);
    const entry = {
      module_id:  moduleId,
      text,
      saved_at:   new Date().toISOString(),
      reviewed:   false,
    };
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    _store.set(_KEYS.reflections, all);
    return { data: entry, error: null };
  },

  async getPendingReflections(_userId) {
    const all    = _store.get(_KEYS.reflections, []);
    const mods   = _store.get(_KEYS.allModules, {});
    const pending = all
      .filter(r => !r.reviewed && mods[r.module_id]?.completed)
      .slice(0, 3);
    return { data: pending, error: null };
  },

  async markReflectionReviewed(_userId, moduleId) {
    const all = _store.get(_KEYS.reflections, []);
    const idx = all.findIndex(r => r.module_id === moduleId);
    if (idx >= 0) { all[idx].reviewed = true; _store.set(_KEYS.reflections, all); }
    return { data: null, error: null };
  },

  // ── Commitments ──────────────────────────────────────────────────

  async saveCommitment(_userId, moduleId, text) {
    const all = _store.get(_KEYS.commitments, []);
    const idx = all.findIndex(c => c.module_id === moduleId);
    const entry = { module_id: moduleId, text, saved_at: new Date().toISOString() };
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    _store.set(_KEYS.commitments, all);
    return { data: entry, error: null };
  },

  // ── Full State (matches DB.loadFullState return shape) ───────────

  async loadFullState(_userId) {
    try {
      const [
        { data: userState },
        { data: pathways },
        { data: modules },
        { data: todayCheckin },
        { data: pendingReflections }
      ] = await Promise.all([
        this.getUserState(_userId),
        this.getPathwayProgress(_userId),
        this.getModuleProgress(_userId),
        this.getTodayCheckin(_userId),
        this.getPendingReflections(_userId),
      ]);
      return {
        userState:          userState          || {},
        pathways:           pathways           || {},
        modules:            modules            || {},
        todayCheckin:       todayCheckin       || null,
        pendingReflections: pendingReflections || [],
        loadedAt:           Date.now(),
      };
    } catch (err) {
      console.error('[LocalDB] loadFullState failed:', err);
      return null;
    }
  },

  // ── Tool Usage (no-op — tools are always available) ──────────────

  async recordToolUsage(_userId, toolId, _from) {
    // No-op. Could log to localStorage if analytics are needed later.
    return { data: null, error: null };
  },

  // ── Feedback (stored locally) ────────────────────────────────────

  async saveFeedback(payload) {
    try {
      const all = _store.get('wellovie_feedback', []);
      all.push({ ...payload, saved_at: new Date().toISOString() });
      _store.set('wellovie_feedback', all);
    } catch {}
    return { data: null, error: null };
  },
};


// ================================================================
// EXPORTS
// ================================================================

window.Auth             = Auth;
window.DB               = DB;
window.FREE_MODULES     = FREE_MODULES;
window.DEVELOPER_EMAILS = DEVELOPER_EMAILS;
window.MODULE_SEQUENCE  = MODULE_SEQUENCE;
window.MODULE_TOOL_MAP  = MODULE_TOOL_MAP;
window.MODULE_PATHWAY_MAP = MODULE_PATHWAY_MAP;
window.PATHWAY_MODULES  = PATHWAY_MODULES;
window.PATHWAY_SEQUENCE = PATHWAY_SEQUENCE;

