/* UI: Tabs and Theme */

export function switchTab(mode) {
  const tabs = document.querySelectorAll('.mode-tab');
  const slider = document.getElementById('tabSlider');

  tabs.forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));

  let activeTab = null;
  let isObf = false;

  if (mode === 'meta') { activeTab = tabs[0]; document.getElementById('formMeta').classList.add('active'); }
  if (mode === 'info') { activeTab = tabs[1]; document.getElementById('formInfo').classList.add('active'); }
  if (mode === 'exif') { activeTab = tabs[2]; document.getElementById('formExif').classList.add('active'); }
  if (mode === 'obf') { activeTab = tabs[3]; document.getElementById('formObf').classList.add('active'); isObf = true; }

  if (activeTab) {
    activeTab.classList.add('active');
    if (slider) {
      const tabsContainer = document.getElementById('modeTabs');
      const containerRect = tabsContainer.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      slider.style.width = tabRect.width + 'px';
      slider.style.left = (tabRect.left - containerRect.left) + 'px';
      if (isObf) slider.classList.add('obf');
      else slider.classList.remove('obf');
    }
  }
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
