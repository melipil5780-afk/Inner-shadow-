// ================================================================
// INNERSHADOW — MODULE ENGINE
// js/module-engine.js
//
// This single engine powers all 24 modules.
// Each module page defines its STEPS array and calls ModuleEngine.init()
// The engine handles everything else: rendering, navigation,
// progress saving, input persistence, completion flow.
//
// HOW TO USE IN A MODULE PAGE:
//
//   <script src="/js/module-engine.js"></script>
//   <script>
//     document.addEventListener(‘DOMContentLoaded’, () => {
//       ModuleEngine.init(‘em-1’, EM1_STEPS);
//     });
//   </script>
//
// STEP OBJECT STRUCTURE:
//   {
//     type:        ‘intro’ | ‘concept’ | ‘worksheet’ | ‘skill’ | ‘commitment’ | ‘reflection’ | ‘complete’,
//     title:       string,
//     render:      function(state) → HTML string,
//     afterRender: function(state) → void  (optional, runs after HTML is inserted)
//     onLeave:     function(state) → void  (optional, runs before moving to next step)
//   }
// ================================================================

const ModuleEngine = (() => {

// ── Private state ──────────────────────────────────────

let _moduleId     = null;
let _steps        = [];
let _currentStep  = 0;
let _user         = null;
let _moduleState  = null;
let _answers      = {};   // keyed by step index
let _saveTimer    = null;

// ── DOM refs ───────────────────────────────────────────

const $ = id => document.getElementById(id);

// ================================================================
// PUBLIC API
// ================================================================

async function init(moduleId, steps) {
_moduleId = moduleId;
_steps    = steps;

```
// Auth guard
const session = await Auth.requireAuth('/index.html');
if (!session) return;
_user = session.user;

// Check access
const isFree = FREE_MODULES.has(moduleId);
if (!isFree) {
  const { data: us } = await DB.getUserState(_user.id);
  if (!us?.is_pro) {
    // Check if unlocked via completion
    const { data: mp } = await DB.getOneModuleProgress(_user.id, moduleId);
    if (!mp?.unlocked) {
      Nav.go('/upgrade.html');
      return;
    }
  }
}

// Load module progress
try {
  const { data } = await DB.getOneModuleProgress(_user.id, moduleId);
  _moduleState = data || {};

  // Restore saved answers from Supabase
  const { data: saved } = await DB.getWorksheetResponses(_user.id, moduleId);
  if (saved) {
    saved.forEach(row => {
      _answers[row.question_num] = row.response;
    });
  }

  // Restore step position — but don't skip past incomplete steps
  if (_moduleState.current_step && _moduleState.current_step > 1) {
    // Start from saved step, but cap at total
    _currentStep = Math.min(
      _moduleState.current_step - 1, // stored as 1-indexed
      _steps.length - 1
    );
  }

} catch (err) {
  console.error('[Engine] State load failed:', err);
  _moduleState = {};
}

// Handle ?reflect=true — jump to reflection step
if (Nav.getParam('reflect') === 'true') {
  const reflectIdx = _steps.findIndex(s => s.type === 'reflection');
  if (reflectIdx > -1) _currentStep = reflectIdx;
}

// Mark started
if (!_moduleState.started) {
  await DB.updateModuleProgress(_user.id, moduleId, {
    started:    true,
    started_at: new Date().toISOString(),
    unlocked:   true
  });
  _moduleState.started = true;
}

render();
UI.markLoaded();
```

}

// ================================================================
// RENDER
// ================================================================

function render() {
const step     = _steps[_currentStep];
const isLast   = _currentStep === _steps.length - 1;
const isFirst  = _currentStep === 0;
const progress = Math.round(((_currentStep + 1) / _steps.length) * 100);

```
// Update header
updateHeader(step, isFirst, isLast, progress);

// Render step content
const container = $('stepContent');
if (!container) return;

container.style.opacity   = '0';
container.style.transform = 'translateY(10px)';

setTimeout(() => {
  container.innerHTML = wrapStep(step);

  // Restore saved input for this step
  restoreInputs();

  // Bind input autosave
  bindInputs();

  // Run afterRender if defined
  if (step.afterRender) {
    step.afterRender({ answers: _answers, moduleId: _moduleId, user: _user });
  }

  container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  container.style.opacity    = '1';
  container.style.transform  = 'translateY(0)';
}, 120);

// Update CTA buttons
updateCTA(step, isFirst, isLast);

// Save progress to Supabase
saveProgress();

// Scroll to top
const scrollEl = $('moduleScroll');
if (scrollEl) scrollEl.scrollTop = 0;
```

}

function wrapStep(step) {
const typeLabel = {
intro:      ‘’,
concept:    ‘The concept’,
worksheet:  ‘Worksheet’,
skill:      ‘The skill’,
commitment: ‘Your commitment’,
reflection: ‘3-day reflection’,
complete:   ‘’
}[step.type] || ‘’;

```
const typeBadge = typeLabel ? `
  <div style="
    display:inline-flex;
    align-items:center;
    gap:0.375rem;
    background:var(--teal-bg-strong);
    border:1px solid var(--teal-border);
    border-radius:999px;
    padding:0.25rem 0.75rem;
    font-size:0.75rem;
    font-weight:700;
    letter-spacing:0.06em;
    text-transform:uppercase;
    color:var(--text-teal);
    margin-bottom:1rem;
  ">${typeLabel}</div>
` : '';

return `
  <div class="step-transition">
    ${typeBadge}
    ${step.render({ answers: _answers, moduleId: _moduleId, user: _user })}
  </div>
`;
```

}

function updateHeader(step, isFirst, isLast, progress) {
// Progress dots
const dotsEl = $(‘progressDots’);
if (dotsEl) {
dotsEl.innerHTML = *steps.map((*, i) => `<div class="progress-dot ${i <= _currentStep ? 'progress-dot--active' : ''}"></div>`).join(’’);
}

```
// Step counter
const counterEl = $('stepCounter');
if (counterEl) {
  counterEl.textContent = `${_currentStep + 1} of ${_steps.length}`;
}

// Module title in header
const titleEl = $('moduleTitle');
if (titleEl) {
  titleEl.textContent = MODULE_LABELS[_moduleId] || '';
}

// Back button state
const backEl = $('backBtn');
if (backEl) backEl.disabled = isFirst;
```

}

function updateCTA(step, isFirst, isLast) {
const nextEl  = $(‘nextBtn’);
const backEl  = $(‘backBtn’);
if (!nextEl) return;

```
// Commitment step — button text changes
if (step.type === 'commitment') {
  nextEl.textContent = 'Save my commitment';
  nextEl.disabled    = false;
  return;
}

// Reflection step
if (step.type === 'reflection') {
  nextEl.textContent = 'Save my reflection';
  nextEl.disabled    = false;
  return;
}

// Complete step — no next button, it has its own CTA
if (step.type === 'complete') {
  nextEl.style.display = 'none';
  if (backEl) backEl.style.display = 'none';
  return;
}

// Worksheet steps — require input
if (step.type === 'worksheet') {
  nextEl.textContent = 'Continue';
  // Will be enabled/disabled by input binding
  nextEl.disabled = !hasValidInput();
  return;
}

nextEl.textContent = isLast ? 'Complete module' : 'Continue';
nextEl.disabled    = false;
nextEl.style.display = '';
if (backEl) backEl.style.display = '';
```

}

// ================================================================
// INPUT MANAGEMENT
// ================================================================

function bindInputs() {
const inputs    = document.querySelectorAll(’.step-input’);
const textareas = document.querySelectorAll(’.step-textarea’);

```
const onChange = () => {
  saveInputsDebounced();
  const nextEl = $('nextBtn');
  if (nextEl && _steps[_currentStep]?.type === 'worksheet') {
    nextEl.disabled = !hasValidInput();
  }
};

inputs.forEach(el => {
  el.addEventListener('input', onChange);
  el.addEventListener('change', onChange);
});

textareas.forEach(el => {
  el.addEventListener('input', onChange);
});

// Checkbox grids
document.querySelectorAll('.step-checkbox').forEach(el => {
  el.addEventListener('change', onChange);
});
```

}

function restoreInputs() {
const savedForStep = _answers[_currentStep];
if (!savedForStep) return;

```
// Single textarea/input
const mainInput = $('stepMainInput') || $('stepMainTextarea');
if (mainInput && typeof savedForStep === 'string') {
  mainInput.value = savedForStep;
  return;
}

// Object of multiple inputs
if (typeof savedForStep === 'object') {
  Object.entries(savedForStep).forEach(([key, val]) => {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = val === true || val === 'true';
    } else {
      el.value = val;
    }
  });
}
```

}

function captureInputs() {
const step = _steps[_currentStep];

```
// Multiple inputs with data-key attributes
const keyed = document.querySelectorAll('[data-key]');
if (keyed.length > 0) {
  const obj = {};
  keyed.forEach(el => {
    obj[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return obj;
}

// Single main input
const mainInput    = $('stepMainInput');
const mainTextarea = $('stepMainTextarea');
if (mainInput)    return mainInput.value;
if (mainTextarea) return mainTextarea.value;

return null;
```

}

function hasValidInput() {
const captured = captureInputs();
if (!captured) return true; // No input required on this step

```
if (typeof captured === 'string') {
  return captured.trim().length >= 10;
}

if (typeof captured === 'object') {
  // At least one field must be filled
  return Object.values(captured).some(v =>
    typeof v === 'string' ? v.trim().length > 0 : v === true
  );
}

return true;
```

}

function saveInputsDebounced() {
if (_saveTimer) clearTimeout(_saveTimer);
_saveTimer = setTimeout(() => saveInputs(), 800);
}

async function saveInputs() {
const captured = captureInputs();
if (!captured) return;

```
_answers[_currentStep] = captured;

// Save to Supabase
const responseStr = typeof captured === 'object'
  ? JSON.stringify(captured)
  : captured;

try {
  await DB.saveWorksheetResponse(
    _user.id,
    _moduleId,
    _currentStep,
    responseStr
  );
} catch (err) {
  console.warn('[Engine] Input save failed:', err);
}
```

}

// ================================================================
// NAVIGATION
// ================================================================

async function next() {
const step = _steps[_currentStep];

```
// Save any pending inputs immediately
if (_saveTimer) {
  clearTimeout(_saveTimer);
  await saveInputs();
}

// Handle commitment step
if (step.type === 'commitment') {
  await handleCommitmentSave();
  return;
}

// Handle reflection step
if (step.type === 'reflection') {
  await handleReflectionSave();
  return;
}

// Run onLeave if defined
if (step.onLeave) {
  step.onLeave({ answers: _answers, moduleId: _moduleId, user: _user });
}

// Advance
if (_currentStep < _steps.length - 1) {
  _currentStep++;
  render();
} else {
  await complete();
}
```

}

function back() {
if (_currentStep > 0) {
_currentStep–;
render();
}
}

function goBackToPathway() {
const pathway = MODULE_PATHWAY_MAP[_moduleId];
Nav.go(`/pathways/${pathway}/overview.html`);
}

function goBackToApp() {
Nav.go(’/app.html?tab=learn’);
}

// ================================================================
// COMMITMENT + REFLECTION
// ================================================================

async function handleCommitmentSave() {
const captured = captureInputs();
const text     = typeof captured === ‘string’
? captured.trim()
: JSON.stringify(captured);

```
if (!text || text.length < 5) {
  UI.showToast('Please write your commitment first.', 'error');
  return;
}

const btn = $('nextBtn');
if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

try {
  await DB.saveCommitment(_user.id, _moduleId, text);
  await DB.updateModuleProgress(_user.id, _moduleId, {
    commitment_made: true
  });
  _moduleState.commitment_made = true;
} catch (err) {
  console.error('[Engine] Commitment save failed:', err);
}

// Advance to next step
_currentStep++;
render();
```

}

async function handleReflectionSave() {
const captured = captureInputs();
const text     = typeof captured === ‘string’
? captured.trim()
: JSON.stringify(captured);

```
if (!text || text.length < 5) {
  UI.showToast('Please write your reflection first.', 'error');
  return;
}

const btn = $('nextBtn');
if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

try {
  await DB.saveReflection(_user.id, _moduleId, text);
  _moduleState.reflection_completed = true;
} catch (err) {
  console.error('[Engine] Reflection save failed:', err);
}

// Advance
_currentStep++;
render();
```

}

// ================================================================
// SAVE PROGRESS
// ================================================================

async function saveProgress() {
try {
await DB.updateModuleProgress(_user.id, _moduleId, {
current_step: _currentStep + 1 // store as 1-indexed
});
} catch (err) {
console.warn(’[Engine] Progress save failed:’, err);
}
}

// ================================================================
// COMPLETE
// ================================================================

async function complete() {
UI.showLoading(‘Saving your progress…’);

```
try {
  const { error, pathwayComplete } = await DB.completeModule(_user.id, _moduleId);

  if (error) throw error;

  _moduleState.completed = true;

  // Get unlocked tool
  const toolId = MODULE_TOOL_MAP[_moduleId];

  UI.hideLoading();

  // Show completion step if defined, otherwise go to completion screen
  const completeStep = _steps.find(s => s.type === 'complete');
  if (completeStep) {
    _currentStep = _steps.indexOf(completeStep);
    render();
  } else {
    // Navigate to pathway complete page
    const pathway = MODULE_PATHWAY_MAP[_moduleId];
    Nav.go(
      pathwayComplete
        ? `/pathways/${pathway}/complete.html`
        : `/pathways/${pathway}/overview.html?completed=${_moduleId}`
    );
  }

  // Celebrate
  setTimeout(() => {
    UI.celebrate({ count: 70, spread: 65, origin: { y: 0.5 } });
  }, 300);

} catch (err) {
  console.error('[Engine] Complete failed:', err);
  UI.hideLoading();
  UI.showToast('Progress saved locally. Sync when reconnected.', 'error');
}
```

}

// ================================================================
// STEP HELPER RENDERERS
// Pre-built HTML blocks for common step patterns.
// Module files call these to build their steps.
// ================================================================

const Blocks = {

```
// Large display heading
heading(text) {
  return `
    <h2 style="
      font-family:var(--font-display);
      font-size:1.75rem;
      font-weight:600;
      color:var(--text-primary);
      letter-spacing:-0.02em;
      line-height:1.25;
      margin-bottom:1rem;
    ">${text}</h2>
  `;
},

// Body paragraph
para(text, style = '') {
  return `
    <p style="
      font-size:0.9375rem;
      color:var(--text-secondary);
      line-height:1.75;
      margin-bottom:1rem;
      ${style}
    ">${text}</p>
  `;
},

// Teal highlighted callout
callout(text) {
  return `
    <div style="
      background:var(--teal-bg);
      border:1px solid var(--teal-border);
      border-radius:1rem;
      padding:1.125rem 1.25rem;
      margin-bottom:1rem;
    ">
      <p style="
        font-size:0.9375rem;
        color:var(--text-secondary);
        line-height:1.7;
      ">${text}</p>
    </div>
  `;
},

// Amber insight box
insight(title, text) {
  return `
    <div style="
      background:var(--amber-bg);
      border:1px solid var(--amber-border);
      border-radius:1rem;
      padding:1.125rem 1.25rem;
      margin-bottom:1rem;
    ">
      <p style="
        font-size:0.75rem;
        font-weight:700;
        letter-spacing:0.07em;
        text-transform:uppercase;
        color:var(--text-amber);
        margin-bottom:0.5rem;
      ">${title}</p>
      <p style="
        font-size:0.9375rem;
        color:var(--text-secondary);
        line-height:1.7;
      ">${text}</p>
    </div>
  `;
},

// Numbered step list
steps(items) {
  return `
    <div style="display:flex;flex-direction:column;gap:0.875rem;margin-bottom:1rem">
      ${items.map((item, i) => `
        <div style="display:flex;gap:0.875rem;align-items:flex-start">
          <div style="
            width:2rem;height:2rem;
            border-radius:0.5rem;
            background:var(--gradient-main);
            display:flex;align-items:center;justify-content:center;
            font-size:0.8125rem;font-weight:700;color:white;
            flex-shrink:0;
          ">${i + 1}</div>
          <p style="
            font-size:0.9375rem;
            color:var(--text-secondary);
            line-height:1.65;
            padding-top:0.25rem;
            flex:1;
          ">${item}</p>
        </div>
      `).join('')}
    </div>
  `;
},

// Red / teal compare blocks
compare(bad, good) {
  return `
    <div style="margin-bottom:1rem">
      <div style="
        background:var(--red-bg);
        border-left:3px solid var(--red);
        border-radius:0 0.75rem 0.75rem 0;
        padding:0.875rem 1rem;
        margin-bottom:0.625rem;
      ">
        <p style="font-size:0.75rem;font-weight:700;color:var(--text-red);margin-bottom:0.375rem;letter-spacing:0.05em;text-transform:uppercase">Before</p>
        <p style="font-size:0.9375rem;color:var(--text-secondary);line-height:1.6">${bad}</p>
      </div>
      <div style="
        background:var(--teal-bg);
        border-left:3px solid var(--teal);
        border-radius:0 0.75rem 0.75rem 0;
        padding:0.875rem 1rem;
      ">
        <p style="font-size:0.75rem;font-weight:700;color:var(--text-teal);margin-bottom:0.375rem;letter-spacing:0.05em;text-transform:uppercase">After</p>
        <p style="font-size:0.9375rem;color:var(--text-secondary);line-height:1.6">${good}</p>
      </div>
    </div>
  `;
},

// Single textarea worksheet input
textarea(id = 'stepMainTextarea', placeholder = 'Write here...', minHeight = '120px') {
  return `
    <textarea
      id="${id}"
      class="step-textarea"
      placeholder="${placeholder}"
      style="
        width:100%;
        padding:0.875rem 1rem;
        background:var(--bg-input);
        border:1.5px solid var(--border-soft);
        border-radius:0.875rem;
        color:var(--text-primary);
        font-size:15px;
        font-family:var(--font-body);
        line-height:1.65;
        min-height:${minHeight};
        resize:vertical;
        -webkit-appearance:none;
        transition:var(--transition-base);
      "
      onfocus="this.style.borderColor='var(--teal-border-strong)';this.style.boxShadow='0 0 0 3px var(--teal-glow-soft)'"
      onblur="this.style.borderColor='';this.style.boxShadow=''"
    ></textarea>
  `;
},

// Text input (single line)
input(key, placeholder = '', label = '') {
  return `
    ${label ? `<p style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.375rem">${label}</p>` : ''}
    <input
      type="text"
      class="step-input"
      data-key="${key}"
      placeholder="${placeholder}"
      style="
        width:100%;
        padding:0.75rem 0.875rem;
        background:var(--bg-input);
        border:1.5px solid var(--border-soft);
        border-radius:0.875rem;
        color:var(--text-primary);
        font-size:15px;
        font-family:var(--font-body);
        margin-bottom:0.625rem;
        -webkit-appearance:none;
        transition:var(--transition-base);
      "
      onfocus="this.style.borderColor='var(--teal-border-strong)'"
      onblur="this.style.borderColor=''"
    >
  `;
},

// Keyed textarea (for multi-input worksheets)
keyedTextarea(key, placeholder = '', label = '', minHeight = '80px') {
  return `
    ${label ? `<p style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.375rem">${label}</p>` : ''}
    <textarea
      class="step-textarea"
      data-key="${key}"
      placeholder="${placeholder}"
      style="
        width:100%;
        padding:0.75rem 0.875rem;
        background:var(--bg-input);
        border:1.5px solid var(--border-soft);
        border-radius:0.875rem;
        color:var(--text-primary);
        font-size:15px;
        font-family:var(--font-body);
        line-height:1.6;
        min-height:${minHeight};
        resize:vertical;
        margin-bottom:0.625rem;
        -webkit-appearance:none;
        transition:var(--transition-base);
      "
      onfocus="this.style.borderColor='var(--teal-border-strong)'"
      onblur="this.style.borderColor=''"
    ></textarea>
  `;
},

// Section divider with label
divider(label) {
  return `
    <p style="
      font-size:0.75rem;
      font-weight:700;
      letter-spacing:0.07em;
      text-transform:uppercase;
      color:var(--text-muted);
      margin:1.25rem 0 0.75rem;
    ">${label}</p>
  `;
},

// Skill box — teal card with skill name + steps
skill(name, tagline, steps) {
  return `
    <div style="
      background:var(--gradient-card);
      border:1px solid var(--teal-border-strong);
      border-radius:1.25rem;
      padding:1.375rem;
      margin-bottom:1rem;
    ">
      <div style="margin-bottom:1rem">
        <p style="
          font-size:0.75rem;font-weight:700;
          letter-spacing:0.07em;text-transform:uppercase;
          color:var(--text-teal);margin-bottom:0.375rem;
        ">The skill</p>
        <h3 style="
          font-family:var(--font-display);
          font-size:1.25rem;font-weight:600;
          color:var(--text-primary);
          letter-spacing:-0.01em;
          margin-bottom:0.25rem;
        ">${name}</h3>
        <p style="font-size:0.875rem;color:var(--text-secondary)">${tagline}</p>
      </div>
      ${Blocks.steps(steps)}
    </div>
  `;
},

// Commitment box
commitment(prompt, placeholder) {
  return `
    <div style="
      background:var(--teal-bg);
      border:1px solid var(--teal-border);
      border-radius:1rem;
      padding:1.125rem 1.25rem;
      margin-bottom:1rem;
    ">
      <p style="font-size:0.9375rem;color:var(--text-secondary);line-height:1.7;margin-bottom:1rem">
        ${prompt}
      </p>
      <p style="font-size:0.875rem;font-weight:600;color:var(--text-teal);margin-bottom:0.5rem">
        I commit to:
      </p>
      ${Blocks.textarea('stepMainTextarea', placeholder, '90px')}
    </div>
    <p style="font-size:0.8125rem;color:var(--text-muted);line-height:1.5;text-align:center">
      We'll follow up in 3 days to see how it's landing.
    </p>
  `;
},

// Reflection box (shown 3 days after commitment)
reflection(commitmentText) {
  return `
    <div style="
      background:var(--amber-bg);
      border:1px solid var(--amber-border);
      border-radius:1rem;
      padding:1.125rem 1.25rem;
      margin-bottom:1rem;
    ">
      <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-amber);margin-bottom:0.5rem">
        Your commitment was
      </p>
      <p style="font-size:0.9375rem;color:var(--text-primary);line-height:1.6;margin-bottom:1rem;font-style:italic">
        "${commitmentText}"
      </p>
      <p style="font-size:0.9375rem;color:var(--text-secondary);line-height:1.7;margin-bottom:1rem">
        How has it actually gone? What did you notice? What was harder or easier than you expected?
      </p>
      ${Blocks.textarea('stepMainTextarea', 'Write honestly — there\'s no right answer here...', '100px')}
    </div>
  `;
},

// Tool unlock card — shown on completion step
toolUnlock(toolEmoji, toolName, toolTagline) {
  return `
    <div style="
      background:linear-gradient(135deg,rgba(13,148,136,0.14),rgba(217,119,6,0.10));
      border:1px solid var(--teal-border-strong);
      border-radius:1.25rem;
      padding:1.5rem;
      text-align:center;
      margin-bottom:1.25rem;
      animation:scale-in 0.4s ease-out;
    ">
      <div style="font-size:3rem;margin-bottom:0.875rem">${toolEmoji}</div>
      <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-teal);margin-bottom:0.375rem">
        Tool unlocked
      </p>
      <h3 style="
        font-family:var(--font-display);
        font-size:1.375rem;font-weight:600;
        color:var(--text-primary);
        letter-spacing:-0.015em;
        margin-bottom:0.375rem;
      ">${toolName}</h3>
      <p style="font-size:0.875rem;color:var(--text-secondary)">${toolTagline}</p>
    </div>
  `;
},

// Complete screen — shown after last step
complete(moduleTitle, pathwayKey, nextModuleId, toolEmoji, toolName, toolTagline) {
  const hasNext = !!nextModuleId;
  return `
    <div style="text-align:center;padding:1rem 0">
      <div style="font-size:4rem;margin-bottom:1.25rem;animation:float 3s ease-in-out infinite">✨</div>
      <h2 style="
        font-family:var(--font-display);
        font-size:1.875rem;font-weight:600;
        color:var(--text-primary);
        letter-spacing:-0.02em;
        margin-bottom:0.625rem;
      ">Module complete</h2>
      <p style="font-size:0.9375rem;color:var(--text-secondary);line-height:1.65;margin-bottom:1.5rem">
        You finished <strong style="color:var(--text-primary)">${moduleTitle}</strong>. That took real work.
      </p>
    </div>

    ${toolEmoji ? Blocks.toolUnlock(toolEmoji, toolName, toolTagline) : ''}

    <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1rem">
      ${hasNext ? `
        <button
          class="btn btn--primary btn--lg"
          onclick="ModuleEngine.goToNextModule('${nextModuleId}','${pathwayKey}')"
        >
          Next module →
        </button>
      ` : ''}
      <button
        class="btn btn--ghost btn--sm"
        onclick="ModuleEngine.goBackToPathway()"
      >
        Back to pathway
      </button>
    </div>
  `;
}
```

};

// ================================================================
// PUBLIC NAVIGATION HELPERS
// Called from complete screen buttons
// ================================================================

function goToNextModule(moduleId, pathway) {
Nav.go(`/pathways/${pathway}/${moduleId}.html`);
}

// ================================================================
// PUBLIC API
// ================================================================

return {
init,
next,
back,
goBackToPathway,
goBackToApp,
goToNextModule,
Blocks,

```
// Expose for complete screen's "start tool" button if needed
get moduleId() { return _moduleId; },
get user()     { return _user; }
```

};

})();

// ================================================================
// MODULE PAGE HTML SHELL
// Every module page uses this exact structure.
// Copy this comment into each module page for reference.
// ================================================================
//
// <div class="shell">
//   <div class="bg-orb bg-orb--teal"></div>
//   <div class="bg-orb bg-orb--amber"></div>
//
//   <!-- Module header -->
//   <div class="module-header">
//     <div class="module-header__row">
//       <button class="module-header__back" onclick="ModuleEngine.goBackToPathway()">←</button>
//       <p class="module-header__title" id="moduleTitle"></p>
//       <span class="module-header__count" id="stepCounter"></span>
//     </div>
//     <div class="progress-dots" id="progressDots"></div>
//   </div>
//
//   <!-- Step content -->
//   <div class="tab-panel tab-panel--active" id="moduleScroll">
//     <div style="padding:1.25rem 1.25rem 2rem" id="stepContent"></div>
//   </div>
//
//   <!-- CTA -->
//   <div class="cta-area">
//     <button class="back-btn-sm" id="backBtn" onclick="ModuleEngine.back()">←</button>
//     <button class="btn btn--primary" id="nextBtn" onclick="ModuleEngine.next()">Continue</button>
//   </div>
// </div>

console.log(’[InnerShadow] Module engine ready’);
