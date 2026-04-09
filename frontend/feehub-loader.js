(function () {
  'use strict';

  // This style is injected before the page renders anything visible.
  // It forces the background dark so users never see the browser's default white flash.
  const antiFlashStyle = document.createElement('style');
  antiFlashStyle.id = 'feehub-anti-flash';
  antiFlashStyle.innerHTML = `
    html, body { background-color: #0a0e1a !important; }
    body > *:not(#feehub-page-loader) {
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.5s ease-in-out !important;
    }
  `;
  document.documentElement.appendChild(antiFlashStyle);

  const loaderHTML = `
  <div id="feehub-page-loader">
    <div class="loader-bg-mesh"></div>
    <div class="loader-grid"></div>
    <div class="loader-orb loader-orb-1"></div>
    <div class="loader-orb loader-orb-2"></div>
    <div class="loader-orb loader-orb-3"></div>
    <div class="loader-particles" id="loader-particles-inner"></div>
    <div class="loader-scanline"></div>

    <div class="loader-helix">
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
    </div>
    <div class="loader-helix loader-helix-right">
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
      <div class="loader-helix-dot"></div><div class="loader-helix-dot"></div>
    </div>

    <div class="loader-center">
      <div class="loader-logo-container">
        <div class="loader-ring"></div>
        <div class="loader-ring loader-ring-2"></div>
        <div class="loader-ring loader-ring-3"></div>
        <div class="loader-logo-glow"></div>
        <div class="loader-logo">FH</div>
      </div>
      <div class="loader-brand">
        <div class="loader-brand-name">FeeHub</div>
        <div class="loader-brand-tagline">Enterprise Cloud</div>
      </div>
      <div class="loader-progress-container">
        <div class="loader-progress-bar" id="loader-progress-bar"></div>
      </div>
      <div class="loader-status">
        <span id="loader-status-text">Loading</span>
        <div class="loader-status-dot"></div>
        <div class="loader-status-dot"></div>
        <div class="loader-status-dot"></div>
      </div>
    </div>

    <div class="loader-hex-strip">
      <div class="loader-hex"></div>
      <div class="loader-hex"></div>
      <div class="loader-hex"></div>
    </div>
  </div>`;

  function injectLoader() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = loaderHTML.trim();
    const loaderEl = wrapper.firstChild;
    document.body.insertBefore(loaderEl, document.body.firstChild);

    const particlesInner = document.getElementById('loader-particles-inner');
    if (particlesInner) {
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'loader-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 4 + 2) + 's';
        p.style.animationDelay = (Math.random() * 3) + 's';
        particlesInner.appendChild(p);
      }
    }
  }

  const statusMessages = [
    'Authenticating session',
    'Connecting to server',
    'Loading your workspace',
    'Fetching fee records',
    'Syncing student data',
    'Almost ready'
  ];
  let msgIndex = 0;
  let statusInterval = null;

  function startStatusCycle() {
    const statusEl = document.getElementById('loader-status-text');
    if (!statusEl) return;
    statusInterval = setInterval(function () {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      statusEl.style.opacity = '0';
      setTimeout(function () {
        statusEl.textContent = statusMessages[msgIndex];
        statusEl.style.opacity = '1';
        statusEl.style.transition = 'opacity 0.3s ease';
      }, 200);
    }, 1800);
  }

  function hideLoader() {
    if (statusInterval) clearInterval(statusInterval);
    const loader = document.getElementById('feehub-page-loader');
    const progressBar = document.getElementById('loader-progress-bar');
    if (!loader) return;

    if (progressBar) {
      progressBar.classList.add('complete');
    }

    setTimeout(function () {
      loader.classList.add('loader-hidden');

      // Remove anti-flash as the loader begins to exit
      const antiFlash = document.getElementById('feehub-anti-flash');
      if (antiFlash) antiFlash.remove();

      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }, 400);
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

  // Expose this so pages like dashboard.html can trigger the hide manually
  // once their own data and UI is fully ready, instead of relying on window.load
  window.feehubLoaderHide = hideLoader;

  window.addEventListener('load', function () {
    setTimeout(function () {
      const loader = document.getElementById('feehub-page-loader');
      if (loader && !loader.classList.contains('loader-hidden')) {
        hideLoader();
      }
    }, 600);
  });

  // Safety net - should never hit 12 seconds in normal use
  setTimeout(hideLoader, 12000);

})();
