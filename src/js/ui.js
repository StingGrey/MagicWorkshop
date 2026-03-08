/* UI: Tabs and Theme */

let currentTab = 'meta';

export function switchTab(mode) {
  if (mode === currentTab) return;

  const tabs = document.querySelectorAll('.mode-tab');
  const slider = document.getElementById('tabSlider');
  const forms = document.querySelectorAll('.form-container');

  // Deactivate old
  tabs.forEach(b => b.classList.remove('active'));
  forms.forEach(f => f.classList.remove('active'));

  let activeTab = null;
  let isObf = false;

  if (mode === 'meta') { activeTab = tabs[0]; }
  if (mode === 'info') { activeTab = tabs[1]; }
  if (mode === 'exif') { activeTab = tabs[2]; }
  if (mode === 'obf')  { activeTab = tabs[3]; isObf = true; }

  if (activeTab) {
    activeTab.classList.add('active');

    // Move slider
    if (slider) {
      const tabsContainer = document.getElementById('modeTabs');
      const containerRect = tabsContainer.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      slider.style.width = tabRect.width + 'px';
      slider.style.left = (tabRect.left - containerRect.left) + 'px';
      slider.classList.toggle('obf', isObf);
    }

    // Activate new form with slight delay for scale+blur effect
    requestAnimationFrame(() => {
      const formMap = { meta: 'formMeta', info: 'formInfo', exif: 'formExif', obf: 'formObf' };
      const target = document.getElementById(formMap[mode]);
      if (target) target.classList.add('active');
    });
  }

  currentTab = mode;
}

export function initTabSlider() {
  const activeTab = document.querySelector('.mode-tab.active');
  const slider = document.getElementById('tabSlider');
  const tabsContainer = document.getElementById('modeTabs');

  if (activeTab && slider && tabsContainer) {
    const containerRect = tabsContainer.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    slider.style.width = tabRect.width + 'px';
    slider.style.left = (tabRect.left - containerRect.left) + 'px';
  }
}

export function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
  document.getElementById('themeIcon').textContent = isLight ? '☀️' : '🌙';
}
