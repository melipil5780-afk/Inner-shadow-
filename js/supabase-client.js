// ================================================================
// INNERSHADOW — SUPABASE CLIENT
// js/supabase-client.js
//
// Import this in every page that needs Supabase.
// Never initialize Supabase anywhere else.
// ================================================================

const SUPABASE_URL = 'https://ocdwpaefmslyidelkzde.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZHdwYWVmbXNseWlkZWxremRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjQ1OTQsImV4cCI6MjA4NTA0MDU5NH0.OAYuCQhxrmZMLI_H8OuaJvs7dKVm82gUPgGzQDUYq-Q';

// ================================================================
// INITIALIZE CLIENT
// ================================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'sb-innershadow-auth-token'
  }
});

// ================================================================
// AUTH HELPERS
// ================================================================

const Auth = {

  // Get current session — null if not logged in
  async getSession() {
    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (error) throw error;
      return session;
    } catch (err) {
      console.error('[Auth] getSession failed:', err);
      return null;
    }
  },

  // Get current user — null if not logged in
  async getUser() {
    try {
      const { data: { user }, error } = await sb.auth.getUser();
      if (error) throw error;
      return user;
    } catch (err) {
      console.error('[Auth] getUser failed:', err);
      return null;
    }
  },

  // Sign in with Google
  async signInWithGoogle(redirectTo = '/disclaimer.html') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    try {
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + redirectTo,
          skipBrowserRedirect: isIOS
        }
      });
      if (error) throw error;
      if (isIOS && data?.url) window.location.href = data.url;
      return { data, error: null };
    } catch (err) {
      console.error('[Auth] Google sign-in failed:', err);
      return { data: null, error: err };
    }
  },

  // Sign up with email + password
  async signUp(email, password) {
    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/disclaimer.html'
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[Auth] Sign up failed:', err);
      return { data: null, error: err };
    }
  },

  // Sign in with email + password
  async signIn(email, password) {
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[Auth] Sign in failed:', err);
      return { data: null, error: err };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      // Clear local cache
      localStorage.removeItem('innershadow_state_cache');
      localStorage.removeItem('innershadow_disclaimer_acknowledged');
      return { error: null };
    } catch (err) {
      console.error('[Auth] Sign out failed:', err);
      return { error: err };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
      });
      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('[Auth] Reset password failed:', err);
      return { error: err };
    }
  },

  // Guard — redirect to index if not logged in
  // Call at top of every protected page
  async requireAuth(redirectTo = '/index.html') {
    const session = await this.getSession();
    if (!session) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  },

  // Guard — redirect to app if already logged in
  // Call at top of auth pages (login, signup)
  async redirectIfLoggedIn(redirectTo = '/app.html') {
    const session = await this.getSession();
    if (session) {
      const disclaimerAcknowledged = localStorage.getItem(
        'innershadow_disclaimer_acknowledged'
      );
      window.location.href = disclaimerAcknowledged === 'true'
        ? redirectTo
        : '/disclaimer.html';
      return true;
    }
    return false;
  },

  // Listen for auth state changes
  onAuthStateChange(callback) {
    return sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

// ================================================================
// DATABASE HELPERS
// All DB operations go through here — never call sb.from() directly
// in page code. Always use DB.*
// ================================================================

const DB = {

  // ── User State ─────────────────────────────────────────

  async getUserState(userId) {
    try {
      const { data, error } = await sb
        .from('user_state')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getUserState failed:', err);
      return { data: null, error: err };
    }
  },

  async updateUserState(userId, updates) {
    try {
      const { data, error } = await sb
        .from('user_state')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] updateUserState failed:', err);
      return { data: null, error: err };
    }
  },

  // ── Pathway Progress ───────────────────────────────────

  async getPathwayProgress(userId) {
    try {
      const { data, error } = await sb
        .from('pathway_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      // Convert array to keyed object for easy access
      const keyed = {};
      (data || []).forEach(row => { keyed[row.pathway_key] = row; });
      return { data: keyed, error: null };
    } catch (err) {
      console.error('[DB] getPathwayProgress failed:', err);
      return { data: null, error: err };
    }
  },

  async updatePathwayProgress(userId, pathwayKey, updates) {
    try {
      const { data, error } = await sb
        .from('pathway_progress')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('pathway_key', pathwayKey)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] updatePathwayProgress failed:', err);
      return { data: null, error: err };
    }
  },

  // ── Module Progress ────────────────────────────────────

  async getModuleProgress(userId) {
    try {
      const { data, error } = await sb
        .from('module_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      // Convert to keyed object
      const keyed = {};
      (data || []).forEach(row => { keyed[row.module_id] = row; });
      return { data: keyed, error: null };
    } catch (err) {
      console.error('[DB] getModuleProgress failed:', err);
      return { data: null, error: err };
    }
  },

  async getOneModuleProgress(userId, moduleId) {
    try {
      const { data, error } = await sb
        .from('module_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getOneModuleProgress failed:', err);
      return { data: null, error: err };
    }
  },

  async updateModuleProgress(userId, moduleId, updates) {
    try {
      const { data, error } = await sb
        .from('module_progress')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] updateModuleProgress failed:', err);
      return { data: null, error: err };
    }
  },

  // Mark module complete and unlock next module + tool
  async completeModule(userId, moduleId) {
    const now = new Date().toISOString();

    // 1. Mark this module complete
    const { error: modErr } = await sb
      .from('module_progress')
      .update({
        completed:    true,
        completed_at: now,
        current_step: 99, // sentinel — fully done
        updated_at:   now
      })
      .eq('user_id', userId)
      .eq('module_id', moduleId);

    if (modErr) {
      console.error('[DB] completeModule — module update failed:', modErr);
      return { error: modErr };
    }

    // 2. Unlock next module in sequence
    const nextModuleId = MODULE_SEQUENCE[moduleId];
    if (nextModuleId) {
      await sb
        .from('module_progress')
        .update({ unlocked: true, updated_at: now })
        .eq('user_id', userId)
        .eq('module_id', nextModuleId);
    }

    // 3. Add tool to user's unlocked tools array
    const toolId = MODULE_TOOL_MAP[moduleId];
    if (toolId) {
      // Use Postgres array append — avoids race conditions
      const { error: rpcError } = await sb.rpc('append_tool_unlocked', {
        p_user_id: userId,
        p_tool_id: toolId
      });
      if (rpcError) console.error('[DB] append_tool_unlocked failed:', rpcError);
    }

    // 4. Check if entire pathway is complete
    const pathwayKey = MODULE_PATHWAY_MAP[moduleId];
    const pathwayModules = PATHWAY_MODULES[pathwayKey];

    const { data: allModules } = await sb
      .from('module_progress')
      .select('module_id, completed')
      .eq('user_id', userId)
      .in('module_id', pathwayModules);

    const allComplete = allModules?.every(m => m.completed);

    if (allComplete) {
      // Mark pathway complete
      await sb
        .from('pathway_progress')
        .update({ completed: true, completed_at: now, updated_at: now })
        .eq('user_id', userId)
        .eq('pathway_key', pathwayKey);

      // Unlock next pathway
      const nextPathway = PATHWAY_SEQUENCE[pathwayKey];
      if (nextPathway) {
        await sb
          .from('pathway_progress')
          .update({ unlocked: true, updated_at: now })
          .eq('user_id', userId)
          .eq('pathway_key', nextPathway);

        // Also unlock first module of next pathway
        const firstModule = PATHWAY_MODULES[nextPathway][0];
        await sb
          .from('module_progress')
          .update({ unlocked: true, updated_at: now })
          .eq('user_id', userId)
          .eq('module_id', firstModule);
      }
    }

    return { error: null, pathwayComplete: allComplete };
  },

  // ── Check-ins ──────────────────────────────────────────

  async getTodayCheckin(userId) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { data, error } = await sb
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getTodayCheckin failed:', err);
      return { data: null, error: err };
    }
  },

  async saveCheckin(userId, mood, note = '') {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { data, error } = await sb
        .from('checkins')
        .upsert({
          user_id: userId,
          date:    today,
          mood,
          note
        }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;

      // Recalculate streak
      await this.recalculateStreak(userId);

      return { data, error: null };
    } catch (err) {
      console.error('[DB] saveCheckin failed:', err);
      return { data: null, error: err };
    }
  },

  async getRecentCheckins(userId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    try {
      const { data, error } = await sb
        .from('checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getRecentCheckins failed:', err);
      return { data: null, error: err };
    }
  },

  // FIXED: Recalculate streak properly (counts both current AND longest)
  async recalculateStreak(userId) {
    try {
      const { data: checkins } = await sb
        .from('checkins')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (!checkins?.length) return;

      let current = 0;
      let longest = 0;
      let prevDate = null;

      for (const c of checkins) {
        const d = new Date(c.date);
        if (prevDate) {
          const diff = (prevDate - d) / (1000 * 60 * 60 * 24);
          if (diff !== 1) current = 0;
        }
        current++;
        longest = Math.max(longest, current);
        prevDate = d;
      }

      await sb
        .from('user_state')
        .update({
          streak_current:  current,
          streak_longest:  longest,
          streak_last_date: checkins[0].date,
          updated_at:      new Date().toISOString()
        })
        .eq('user_id', userId);

    } catch (err) {
      console.error('[DB] recalculateStreak failed:', err);
    }
  },

  // ── Worksheet Responses ────────────────────────────────

  async saveWorksheetResponse(userId, moduleId, questionNum, response) {
    try {
      const { data, error } = await sb
        .from('worksheet_responses')
        .upsert({
          user_id:      userId,
          module_id:    moduleId,
          question_num: questionNum,
          response
        }, { onConflict: 'user_id,module_id,question_num' })
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] saveWorksheetResponse failed:', err);
      return { data: null, error: err };
    }
  },

  async getWorksheetResponses(userId, moduleId) {
    try {
      const { data, error } = await sb
        .from('worksheet_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .order('question_num');
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getWorksheetResponses failed:', err);
      return { data: null, error: err };
    }
  },

  // ── Commitments ────────────────────────────────────────

  async saveCommitment(userId, moduleId, commitmentText) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);

    try {
      const { data, error } = await sb
        .from('commitments')
        .upsert({
          user_id:         userId,
          module_id:       moduleId,
          commitment_text: commitmentText,
          follow_up_date:  followUpDate.toISOString().slice(0, 10)
        }, { onConflict: 'user_id,module_id' })
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] saveCommitment failed:', err);
      return { data: null, error: err };
    }
  },

  async getPendingReflections(userId) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { data, error } = await sb
        .from('commitments')
        .select('*')
        .eq('user_id', userId)
        .lte('follow_up_date', today)
        .is('reflected_at', null);
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('[DB] getPendingReflections failed:', err);
      return { data: null, error: err };
    }
  },

  async saveReflection(userId, moduleId, reflectionResponse) {
    try {
      const { data, error } = await sb
        .from('commitments')
        .update({
          reflected_at:       new Date().toISOString(),
          reflection_response: reflectionResponse
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .select()
        .single();
      if (error) throw error;

      // Also mark reflection complete on module
      await sb
        .from('module_progress')
        .update({
          reflection_completed: true,
          updated_at:           new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      return { data, error: null };
    } catch (err) {
      console.error('[DB] saveReflection failed:', err);
      return { data: null, error: err };
    }
  },

  // ── Tool Usage ─────────────────────────────────────────

  async recordToolUsage(userId, toolId, triggeredFrom = 'direct') {
    try {
      await sb.from('tool_usage').insert({
        user_id:        userId,
        tool_id:        toolId,
        triggered_from: triggeredFrom
      });

      // Update recently used in user_state
      const { error: rpcError } = await sb.rpc('prepend_recently_used_tool', {
        p_user_id: userId,
        p_tool_id: toolId
      });
      if (rpcError) console.error('[DB] prepend_recently_used_tool failed:', rpcError);

      return { error: null };
    } catch (err) {
      console.error('[DB] recordToolUsage failed:', err);
      return { error: err };
    }
  },

  // ── Assessment ─────────────────────────────────────────

  async saveAssessment(userId, answers, primaryPathway,
                       intensityLevel, experienceLevel, reflectionBack) {
    try {
      const { data, error } = await sb
        .from('user_state')
        .update({
          assessment_completed:    true,
          assessment_completed_at: new Date().toISOString(),
          assessment_answers:      answers,
          primary_pathway:         primaryPathway,
          intensity_level:         intensityLevel,
          experience_level:        experienceLevel,
          reflection_back:         reflectionBack,
          updated_at:              new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;

      // Mark primary pathway as started
      await sb
        .from('pathway_progress')
        .update({ started: true, started_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('pathway_key', primaryPathway);

      return { data, error: null };
    } catch (err) {
      console.error('[DB] saveAssessment failed:', err);
      return { data: null, error: err };
    }
  },

  // ── Full State Load ────────────────────────────────────
  // Load everything needed to render the app in one go
  // Returns a unified state object used by State manager

  async loadFullState(userId) {
    try {
      const [
        { data: userState },
        { data: pathways },
        { data: modules },
        { data: todayCheckin },
        { data: pendingReflections }
      ] = await Promise.all([
        this.getUserState(userId),
        this.getPathwayProgress(userId),
        this.getModuleProgress(userId),
        this.getTodayCheckin(userId),
        this.getPendingReflections(userId)
      ]);

      return {
        userState:          userState || {},
        pathways:           pathways  || {},
        modules:            modules   || {},
        todayCheckin:       todayCheckin || null,
        pendingReflections: pendingReflections || [],
        loadedAt:           Date.now()
      };
    } catch (err) {
      console.error('[DB] loadFullState failed:', err);
      return null;
    }
  }
};

// ================================================================
// CONSTANTS — Module and pathway relationships
// ================================================================

// Which module unlocks after completing each module
const MODULE_SEQUENCE = {
  'em-1': 'em-2',
  'em-2': 'em-3',
  'em-3': 'em-4',
  'em-4': 'em-5',
  'em-5': 'em-6',
  'em-6': null,
  'id-1': 'id-2',
  'id-2': 'id-3',
  'id-3': 'id-4',
  'id-4': 'id-5',
  'id-5': 'id-6',
  'id-6': null,
  'cn-1': 'cn-2',
  'cn-2': 'cn-3',
  'cn-3': 'cn-4',
  'cn-4': 'cn-5',
  'cn-5': 'cn-6',
  'cn-6': null,
  'lw-1': 'lw-2',
  'lw-2': 'lw-3',
  'lw-3': 'lw-4',
  'lw-4': 'lw-5',
  'lw-5': 'lw-6',
  'lw-6': null
};

// Which pathway each module belongs to
const MODULE_PATHWAY_MAP = {
  'em-1': 'emotional', 'em-2': 'emotional', 'em-3': 'emotional',
  'em-4': 'emotional', 'em-5': 'emotional', 'em-6': 'emotional',
  'id-1': 'identity',  'id-2': 'identity',  'id-3': 'identity',
  'id-4': 'identity',  'id-5': 'identity',  'id-6': 'identity',
  'cn-1': 'connection','cn-2': 'connection','cn-3': 'connection',
  'cn-4': 'connection','cn-5': 'connection','cn-6': 'connection',
  'lw-1': 'living',   'lw-2': 'living',   'lw-3': 'living',
  'lw-4': 'living',   'lw-5': 'living',   'lw-6': 'living'
};

// All modules in each pathway — in order
const PATHWAY_MODULES = {
  emotional:  ['em-1','em-2','em-3','em-4','em-5','em-6'],
  identity:   ['id-1','id-2','id-3','id-4','id-5','id-6'],
  connection: ['cn-1','cn-2','cn-3','cn-4','cn-5','cn-6'],
  living:     ['lw-1','lw-2','lw-3','lw-4','lw-5','lw-6']
};

// Which pathway unlocks after completing each pathway
const PATHWAY_SEQUENCE = {
  emotional:  'identity',
  identity:   'connection',
  connection: 'living',
  living:     null
};

// Which tool is unlocked by completing each module
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
  'lw-6': 'tool-living-deliberately'
};

// Free modules — accessible without Pro
const FREE_MODULES = new Set(['em-1', 'em-2', 'id-1', 'cn-1', 'lw-1']);

// Free tools — always accessible
const FREE_TOOLS = new Set([
  'tool-physiological-sigh',
  'tool-cold-reset',
  'tool-move-it-out',
  'tool-come-to-now',
  'tool-butterfly-hold',
  'tool-safety-scan',
  'tool-full-body-shake',
  'tool-name-it'
]);

// Human-readable labels
const PATHWAY_LABELS = {
  emotional:  'Emotional Foundations',
  identity:   'Knowing Yourself',
  connection: 'Connection',
  living:     'Living Well'
};

const PATHWAY_ICONS = {
  emotional:  '🌊',
  identity:   '🪞',
  connection: '💔',
  living:     '🌱'
};

const MODULE_LABELS = {
  'em-1': 'What Emotions Actually Are',
  'em-2': 'Your Body Knows First',
  'em-3': 'The Stories We Tell Ourselves',
  'em-4': 'Self-Compassion Is Not Weakness',
  'em-5': 'Your Patterns and Where They Came From',
  'em-6': 'Regulation — Coming Back to Yourself',
  'id-1': 'Who Told You That Was You?',
  'id-2': 'What Do You Actually Value?',
  'id-3': 'The Story You Tell About Yourself',
  'id-4': 'What Actually Makes You Happy',
  'id-5': 'The Parts You Keep Hidden',
  'id-6': 'Living as Yourself',
  'cn-1': 'How Connection Actually Works',
  'cn-2': 'The Art of Actually Listening',
  'cn-3': 'Saying What\'s Actually True',
  'cn-4': 'Conflict as a Path to Closeness',
  'cn-5': 'Setting Limits Without Losing the Relationship',
  'cn-6': 'Building a Relational Life',
  'lw-1': 'The Difference Between a Good Life and a Full Calendar',
  'lw-2': 'Meaning',
  'lw-3': 'Enough',
  'lw-4': 'The People You Become Through',
  'lw-5': 'The Architecture of a Good Day',
  'lw-6': 'A Life That Is Yours'
};

// ================================================================
// SUPABASE RPC FUNCTIONS
// Run these in your Supabase SQL editor to enable tool tracking
// ================================================================

/*

-- Append a tool ID to user's unlocked tools array (no duplicates)
create or replace function append_tool_unlocked(
  p_user_id uuid,
  p_tool_id text
) returns void as $$
begin
  update user_state
  set tools_unlocked = array_append(
    array_remove(tools_unlocked, p_tool_id),
    p_tool_id
  )
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- Prepend a tool to recently used (keep max 5)
create or replace function prepend_recently_used_tool(
  p_user_id uuid,
  p_tool_id text
) returns void as $$
begin
  update user_state
  set tools_recently_used = (
    array_prepend(
      p_tool_id,
      array_remove(tools_recently_used, p_tool_id)
    )
  )[1:5]
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

*/

// ================================================================
// EXPORT
// Everything pages need is on window for easy access
// ================================================================

window.sb   = sb;
window.Auth = Auth;
window.DB   = DB;

window.MODULE_SEQUENCE    = MODULE_SEQUENCE;
window.MODULE_PATHWAY_MAP = MODULE_PATHWAY_MAP;
window.MODULE_TOOL_MAP    = MODULE_TOOL_MAP;
window.MODULE_LABELS      = MODULE_LABELS;
window.PATHWAY_MODULES    = PATHWAY_MODULES;
window.PATHWAY_SEQUENCE   = PATHWAY_SEQUENCE;
window.PATHWAY_LABELS     = PATHWAY_LABELS;
window.PATHWAY_ICONS      = PATHWAY_ICONS;
window.FREE_MODULES       = FREE_MODULES;
window.FREE_TOOLS         = FREE_TOOLS;

console.log('[InnerShadow] Supabase client ready');
