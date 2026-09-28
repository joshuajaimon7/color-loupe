// ColorLoupe Pro - Popup Logic
// Eyedropper, 10-Step Tint/Shade Engine, WCAG 2.1 Auditor, Color Blindness Matrix, and Token Exporter

const STORE_CHECKOUT_URL = "https://micro-software-lab.lemonsqueezy.com/checkout/buy/a749cf66-9bd5-48ee-9b27-c3e949d253f0";

let currentColor = '#2997FF';
let isPro = false;
let currentScale = {};

// DOM Elements
const pickColorBtn = document.getElementById('pickColorBtn');
const scanPageBtn = document.getElementById('scanPageBtn');
const heroSwatch = document.getElementById('heroSwatch');
const heroHexCode = document.getElementById('heroHexCode');
const quickCopyHexBtn = document.getElementById('quickCopyHexBtn');
const valHex = document.getElementById('valHex');
const valRgb = document.getElementById('valRgb');
const valHsl = document.getElementById('valHsl');
const valTailwind = document.getElementById('valTailwind');
const scaleContainer = document.getElementById('scaleContainer');
const contrastWhiteRatio = document.getElementById('contrastWhiteRatio');
const contrastBlackRatio = document.getElementById('contrastBlackRatio');
const wcagWhiteAA = document.getElementById('wcagWhiteAA');
const wcagWhiteLarge = document.getElementById('wcagWhiteLarge');
const wcagBlackAA = document.getElementById('wcagBlackAA');
const wcagBlackAAA = document.getElementById('wcagBlackAAA');
const blindProtan = document.getElementById('blindProtan');
const blindDeutan = document.getElementById('blindDeutan');
const blindTritan = document.getElementById('blindTritan');
const blindMono = document.getElementById('blindMono');
const sitePaletteBox = document.getElementById('sitePaletteBox');
const siteSwatchesList = document.getElementById('siteSwatchesList');
const clearSitePaletteBtn = document.getElementById('clearSitePaletteBtn');
const exportTailwindBtn = document.getElementById('exportTailwindBtn');
const exportCssVarsBtn = document.getElementById('exportCssVarsBtn');
const exportTokensJsonBtn = document.getElementById('exportTokensJsonBtn');
const upgradeBtn = document.getElementById('upgradeBtn');
const proUpgradeLink = document.getElementById('proUpgradeLink');
const upgradeModal = document.getElementById('upgradeModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const startCheckoutBtn = document.getElementById('startCheckoutBtn');
const licenseKeyInput = document.getElementById('licenseKeyInput');
const activateKeyBtn = document.getElementById('activateKeyBtn');
const licenseStatus = document.getElementById('licenseStatus');
const proHeaderBadge = document.getElementById('proHeaderBadge');
const footerBanner = document.getElementById('footerBanner');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await checkProStatus();
  updateColorView(currentColor);
  setupEventListeners();
});

async function checkProStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isProLicense', 'lastPickedColor'], (res) => {
      isPro = !!res.isProLicense;
      if (res.lastPickedColor) currentColor = res.lastPickedColor;
      renderProUI(isPro);
      resolve();
    });
  });
}

function renderProUI(pro) {
  if (pro) {
    proHeaderBadge.classList.add('unlocked');
    upgradeBtn.textContent = 'Pro Active';
    upgradeBtn.classList.add('is-pro');
    footerBanner.innerHTML = '<span>ColorLoupe Pro Unlimited License Active</span>';
  } else {
    proHeaderBadge.classList.remove('unlocked');
    upgradeBtn.textContent = 'Upgrade';
    upgradeBtn.classList.remove('is-pro');
    footerBanner.innerHTML = `
      <span>Free tier: Basic HEX/RGB copy</span>
      <a href="#" id="proUpgradeLink" class="pro-link">Unlock Pro Lifetime ($4.99)</a>
    `;
    const newLink = document.getElementById('proUpgradeLink');
    if (newLink) newLink.addEventListener('click', (e) => { e.preventDefault(); openUpgradeModal(); });
  }
}

// Color Math Utilities
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const clamp = Math.max(0, Math.min(255, Math.round(x)));
    const h = clamp.toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('').toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function getRelativeLuminance(r, g, b) {
  function srgb(c) {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function getContrastRatio(lum1, lum2) {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

// 10-Step Tint & Shade Generator (50 to 950)
function generateShadeScale(baseHex) {
  const base = hexToRgb(baseHex);
  const shades = {};
  const steps = [
    { key: 50, factor: 0.92, isTint: true },
    { key: 100, factor: 0.80, isTint: true },
    { key: 200, factor: 0.60, isTint: true },
    { key: 300, factor: 0.40, isTint: true },
    { key: 400, factor: 0.20, isTint: true },
    { key: 500, factor: 0.00, isBase: true },
    { key: 600, factor: 0.20, isTint: false },
    { key: 700, factor: 0.40, isTint: false },
    { key: 800, factor: 0.60, isTint: false },
    { key: 900, factor: 0.80, isTint: false },
    { key: 950, factor: 0.90, isTint: false }
  ];

  steps.forEach(step => {
    if (step.isBase) {
      shades[step.key] = baseHex.toUpperCase();
    } else if (step.isTint) {
      // Blend with pure white #ffffff
      const r = base.r + (255 - base.r) * step.factor;
      const g = base.g + (255 - base.g) * step.factor;
      const b = base.b + (255 - base.b) * step.factor;
      shades[step.key] = rgbToHex(r, g, b);
    } else {
      // Blend with pure black #000000
      const r = base.r * (1 - step.factor);
      const g = base.g * (1 - step.factor);
      const b = base.b * (1 - step.factor);
      shades[step.key] = rgbToHex(r, g, b);
    }
  });

  return shades;
}

// Color Blindness Simulation
function simulateColorBlindness(r, g, b) {
  // Protanopia (red-blind)
  const protanR = 0.56667 * r + 0.43333 * g;
  const protanG = 0.55833 * r + 0.44167 * g;
  const protanB = 0.24167 * g + 0.75833 * b;

  // Deuteranopia (green-blind)
  const deutanR = 0.625 * r + 0.375 * g;
  const deutanG = 0.700 * r + 0.300 * g;
  const deutanB = 0.300 * g + 0.700 * b;

  // Tritanopia (blue-blind)
  const tritanR = 0.950 * r + 0.050 * g;
  const tritanG = 0.43333 * g + 0.56667 * b;
  const tritanB = 0.475 * g + 0.525 * b;

  // Achromatopsia (monochrome)
  const mono = 0.299 * r + 0.587 * g + 0.114 * b;

  return {
    protan: rgbToHex(protanR, protanG, protanB),
    deutan: rgbToHex(deutanR, deutanG, deutanB),
    tritan: rgbToHex(tritanR, tritanG, tritanB),
    mono: rgbToHex(mono, mono, mono)
  };
}

// Update View
function updateColorView(hex) {
  currentColor = hex.toUpperCase();
  chrome.storage.local.set({ lastPickedColor: currentColor });

  const rgb = hexToRgb(currentColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Hero Card
  heroSwatch.style.backgroundColor = currentColor;
  heroHexCode.textContent = currentColor;
  valHex.textContent = currentColor;
  valRgb.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  valHsl.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  valTailwind.textContent = `bg-[${currentColor.toLowerCase()}]`;

  // 10-Step Scale
  currentScale = generateShadeScale(currentColor);
  renderScaleBar(currentScale);

  // WCAG Contrast
  const curLum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
  const whiteLum = 1.0;
  const blackLum = 0.0;

  const whiteRatio = getContrastRatio(curLum, whiteLum);
  const blackRatio = getContrastRatio(curLum, blackLum);

  contrastWhiteRatio.textContent = `${whiteRatio.toFixed(1)}:1`;
  contrastBlackRatio.textContent = `${blackRatio.toFixed(1)}:1`;

  // White Badges
  updateBadge(wcagWhiteAA, whiteRatio >= 4.5, 'AA Normal');
  updateBadge(wcagWhiteLarge, whiteRatio >= 3.0, 'AA Large');

  // Black Badges
  updateBadge(wcagBlackAA, blackRatio >= 4.5, 'AA Normal');
  updateBadge(wcagBlackAAA, blackRatio >= 7.0, 'AAA Large');

  // Color Blindness Simulation
  const blind = simulateColorBlindness(rgb.r, rgb.g, rgb.b);
  blindProtan.style.backgroundColor = blind.protan;
  blindDeutan.style.backgroundColor = blind.deutan;
  blindTritan.style.backgroundColor = blind.tritan;
  blindMono.style.backgroundColor = blind.mono;
}

function updateBadge(el, pass, label) {
  if (pass) {
    el.className = 'wcag-pill pass';
    el.textContent = `${label}: Pass`;
  } else {
    el.className = 'wcag-pill fail';
    el.textContent = `${label}: Fail`;
  }
}

function renderScaleBar(shades) {
  scaleContainer.innerHTML = '';
  Object.keys(shades).forEach(key => {
    const hex = shades[key];
    const chip = document.createElement('div');
    chip.className = 'scale-chip';
    chip.style.backgroundColor = hex;
    chip.title = `${key}: ${hex} (Click to copy)`;

    // Adjust text color based on step
    const textColor = parseInt(key, 10) < 500 ? '#000000' : '#ffffff';
    chip.innerHTML = `<span style="color: ${textColor};">${key}</span>`;

    chip.addEventListener('click', () => {
      if (!isPro && parseInt(key, 10) !== 500) {
        openUpgradeModal();
        return;
      }
      copyToClipboard(hex, `Copied Shade ${key} (${hex})`);
    });

    scaleContainer.appendChild(chip);
  });
}

function copyToClipboard(text, notice) {
  navigator.clipboard.writeText(text).then(() => {
    flashCopyNotice(notice || 'Copied to clipboard');
  }).catch(() => {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    flashCopyNotice(notice || 'Copied to clipboard');
  });
}

function flashCopyNotice(msg) {
  quickCopyHexBtn.textContent = 'Copied!';
  setTimeout(() => {
    quickCopyHexBtn.textContent = 'Copy';
  }, 1200);
}

// Eyedropper Trigger
async function pickPixelColor() {
  if ('EyeDropper' in window) {
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        updateColorView(result.sRGBHex);
      }
    } catch (err) {
      // User cancelled selection or ESC pressed
    }
  } else {
    alert('Native EyeDropper API requires Chrome 95+. Please test on a supported version.');
  }
}

// Site Palette Scan
async function scanPagePalette() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { type: 'SCAN_SITE_PALETTE' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.colors) {
        alert('Could not scan active tab. Please refresh the page and try again.');
        return;
      }

      renderSitePalette(response.colors, response.url);
    });
  } catch (e) {
    alert('Scan error: please refresh the active webpage.');
  }
}

function renderSitePalette(colors, domain) {
  sitePaletteBox.style.display = 'block';
  document.getElementById('sitePaletteTitle').textContent = domain ? `Discovered: ${domain}` : 'Discovered Page Palette';
  siteSwatchesList.innerHTML = '';

  colors.forEach(hex => {
    const pill = document.createElement('div');
    pill.className = 'site-swatch-pill';
    pill.style.backgroundColor = hex;
    pill.title = `${hex} (Click to inspect)`;

    pill.addEventListener('click', () => {
      updateColorView(hex);
      copyToClipboard(hex, `Copied ${hex}`);
    });

    siteSwatchesList.appendChild(pill);
  });
}

// Code Builders
function buildTailwindConfig(shades) {
  const lines = Object.keys(shades).map(k => `        ${k}: '${shades[k].toLowerCase()}',`).join('\n');
  return `/** Tailwind CSS Color Palette */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n${lines}\n        },\n      },\n    },\n  },\n};`;
}

function buildCssVars(shades) {
  const lines = Object.keys(shades).map(k => `  --color-brand-${k}: ${shades[k]};`).join('\n');
  return `/* ColorLoupe Pro - Design System Tokens */\n:root {\n${lines}\n}`;
}

function buildTokensJson(shades) {
  const tokens = {
    brand: {}
  };
  Object.keys(shades).forEach(k => {
    tokens.brand[k] = {
      value: shades[k],
      type: 'color'
    };
  });
  return JSON.stringify({ color: tokens }, null, 2);
}

// Event Listeners
function setupEventListeners() {
  pickColorBtn.addEventListener('click', pickPixelColor);
  scanPageBtn.addEventListener('click', scanPagePalette);

  quickCopyHexBtn.addEventListener('click', () => {
    copyToClipboard(currentColor, `Copied ${currentColor}`);
  });

  // Format Click to Copy
  document.querySelectorAll('.format-item').forEach(item => {
    item.addEventListener('click', () => {
      const format = item.getAttribute('data-format');
      let val = '';
      if (format === 'hex') val = valHex.textContent;
      if (format === 'rgb') val = valRgb.textContent;
      if (format === 'hsl') val = valHsl.textContent;
      if (format === 'tailwind') val = valTailwind.textContent;
      copyToClipboard(val, `Copied ${val}`);
    });
  });

  // Export Buttons
  exportTailwindBtn.addEventListener('click', () => {
    if (!isPro) {
      openUpgradeModal();
      return;
    }
    const code = buildTailwindConfig(currentScale);
    copyToClipboard(code, 'Copied Tailwind Config');
  });

  exportCssVarsBtn.addEventListener('click', () => {
    if (!isPro) {
      openUpgradeModal();
      return;
    }
    const code = buildCssVars(currentScale);
    copyToClipboard(code, 'Copied CSS Variables');
  });

  exportTokensJsonBtn.addEventListener('click', () => {
    if (!isPro) {
      openUpgradeModal();
      return;
    }
    const code = buildTokensJson(currentScale);
    copyToClipboard(code, 'Copied Figma Tokens JSON');
  });

  clearSitePaletteBtn.addEventListener('click', () => {
    sitePaletteBox.style.display = 'none';
  });

  // Upgrade Modal Handlers
  upgradeBtn.addEventListener('click', () => {
    if (!isPro) openUpgradeModal();
  });

  modalCloseBtn.addEventListener('click', closeUpgradeModal);
  upgradeModal.addEventListener('click', (e) => {
    if (e.target === upgradeModal) closeUpgradeModal();
  });

  startCheckoutBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: STORE_CHECKOUT_URL });
  });

  activateKeyBtn.addEventListener('click', handleLicenseActivation);
  licenseKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLicenseActivation();
  });
}

function openUpgradeModal() {
  upgradeModal.style.display = 'flex';
}

function closeUpgradeModal() {
  upgradeModal.style.display = 'none';
  licenseStatus.textContent = '';
  licenseStatus.className = 'license-status';
}

function handleLicenseActivation() {
  const key = (licenseKeyInput.value || '').trim();
  if (!key) {
    showLicenseMsg('Please enter a valid license key', false);
    return;
  }

  if (key.length >= 8) {
    chrome.storage.local.set({ isProLicense: true, licenseKey: key }, () => {
      isPro = true;
      renderProUI(true);
      showLicenseMsg('License activated! All Pro features unlocked.', true);
      setTimeout(() => {
        closeUpgradeModal();
      }, 1400);
    });
  } else {
    showLicenseMsg('Invalid key. Format: COLOR-XXXX-XXXX', false);
  }
}

function showLicenseMsg(msg, success) {
  licenseStatus.textContent = msg;
  licenseStatus.className = `license-status ${success ? 'success' : 'error'}`;
}
