(function () {
  'use strict';

  // Instant Anti-Flash Injection
  const antiFlashStyle = document.createElement('style');
  antiFlashStyle.id = 'feehub-anti-flash';
  antiFlashStyle.innerHTML = `
    html, body { background-color: #030712 !important; }
    body > *:not(#feehub-page-loader) {
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.5s ease-in-out !important;
    }
  `;
  document.documentElement.appendChild(antiFlashStyle);

  const loaderHTML = `
  <div id="feehub-page-loader">
    <div class="loader-nebula">
      <div class="loader-orb orb-1"></div>
      <div class="loader-orb orb-2"></div>
      <div class="loader-orb orb-3"></div>
    </div>
    
    <div class="loader-grid">
      <div class="loader-grid-inner"></div>
    </div>

    <div class="loader-scan-line"></div>

    <div class="loader-glass">
      <div class="logo-stack">
        <div class="logo-rings"></div>
        <div class="logo-rings ring-2"></div>
        <div class="logo-rings ring-3"></div>
        <div class="logo-main">FH</div>
      </div>

      <div class="brand-txt">
        <div class="brand-name">FeeHub</div>
        <div class="brand-status">Secure Workspace</div>
      </div>

      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" id="loader-progress-bar"></div>
          <div class="progress-scanner"></div>
        </div>
        <div class="status-label">
          <span id="loader-status-text">Initializing Engine</span>
          <div class="loader-dot"></div>
          <div class="loader-dot" style="animation-delay: 0.2s"></div>
          <div class="loader-dot" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    </div>
  </div>`;

  function injectLoader() {
    if (document.getElementById('feehub-page-loader')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = loaderHTML.trim();
    const loaderEl = wrapper.firstChild;
    document.body.insertBefore(loaderEl, document.body.firstChild);
    
    // Initial progress nudge
    setTimeout(() => {
        const bar = document.getElementById('loader-progress-bar');
        if (bar) bar.style.width = '35%';
    }, 100);
  }

  const statusMessages = [
    'Secure Handshake',
    'Decrypting Vault',
    'Initializing Multi-Tenancy',
    'Syncing Fee Masters',
    'Compiling Dashboard',
    'Environment Ready'
  ];
  let msgIndex = 0;
  let statusInterval = null;

  function startStatusCycle() {
    const statusEl = document.getElementById('loader-status-text');
    const bar = document.getElementById('loader-progress-bar');
    if (!statusEl) return;

    statusInterval = setInterval(function () {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      
      // Update Text
      statusEl.style.opacity = '0';
      setTimeout(function () {
        statusEl.textContent = statusMessages[msgIndex];
        statusEl.style.opacity = '1';
        
        // Nudge progress bar
        if (bar) {
            const currentWidth = parseInt(bar.style.width) || 35;
            if (currentWidth < 90) {
                bar.style.width = (currentWidth + Math.floor(Math.random() * 15)) + '%';
            }
        }
      }, 300);
    }, 1800);
  }

  function hideLoader() {
    if (statusInterval) clearInterval(statusInterval);
    const loader = document.getElementById('feehub-page-loader');
    const bar = document.getElementById('loader-progress-bar');
    if (!loader) return;

    if (bar) bar.style.width = '100%';

    setTimeout(function () {
      loader.classList.add('loader-hidden');
      const antiFlash = document.getElementById('feehub-anti-flash');
      if (antiFlash) antiFlash.remove();

      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 800);
    }, 500);
  }

  if (document.body) {
    injectLoader();
    startStatusCycle();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      injectLoader();
      startStatusCycle();
    });
  }

  window.feehubLoaderHide = hideLoader;

  window.addEventListener('load', function () {
    setTimeout(function () {
      const loader = document.getElementById('feehub-page-loader');
      if (loader && !loader.classList.contains('loader-hidden')) {
        hideLoader();
      }
    }, 800);
  });

  setTimeout(hideLoader, 15000); // Safety limit
})();
