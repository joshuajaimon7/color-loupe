// ColorLoupe Pro - Content Script
// Scans active webpage for computed color palettes, gradients, and typography colors

(function () {
  if (window.__colorloupe_injected) return;
  window.__colorloupe_injected = true;

  function rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'transparent' || rgbStr === 'inherit') return null;
    const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
    if (a === 0) return null; // fully transparent

    const hex = '#' + [r, g, b].map(x => {
      const h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
    return hex.toUpperCase();
  }

  function scanSiteColors() {
    const colorCounts = new Map();
    const gradients = new Set();
    const elements = document.querySelectorAll('*');
    const maxElements = Math.min(elements.length, 1200);

    for (let i = 0; i < maxElements; i++) {
      const el = elements[i];
      // Skip hidden elements
      if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

      try {
        const style = window.getComputedStyle(el);
        const bg = rgbToHex(style.backgroundColor);
        const text = rgbToHex(style.color);
        const border = rgbToHex(style.borderColor);
        const bgImage = style.backgroundImage;

        if (bg) colorCounts.set(bg, (colorCounts.get(bg) || 0) + 2);
        if (text) colorCounts.set(text, (colorCounts.get(text) || 0) + 1);
        if (border) colorCounts.set(border, (colorCounts.get(border) || 0) + 1);

        if (bgImage && (bgImage.includes('gradient('))) {
          gradients.add(bgImage);
        }
      } catch (e) {}
    }

    // Sort by prevalence
    const sorted = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Filter out pure black and pure white duplicates if they are already present, keep top 12
    return {
      colors: sorted.slice(0, 14),
      gradients: Array.from(gradients).slice(0, 4)
    };
  }

  function showToast(colorHex, label = 'Copied') {
    let toast = document.getElementById('colorloupe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'colorloupe-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="colorloupe-toast-swatch" style="background-color: ${colorHex};"></div>
      <span>${label}: <strong>${colorHex}</strong></span>
    `;
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2000);
  }

  // Listener for popup messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_SITE_PALETTE') {
      const palette = scanSiteColors();
      sendResponse({
        success: true,
        colors: palette.colors,
        gradients: palette.gradients,
        url: window.location.hostname
      });
      return true;
    }

    if (request.type === 'SHOW_TOAST') {
      showToast(request.color, request.label);
      sendResponse({ success: true });
      return true;
    }
  });
})();
