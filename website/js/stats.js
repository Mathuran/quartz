/**
 * Fetch live GitHub stars and VS Code Marketplace install count
 */

const GITHUB_REPO = 'mathuransadagopan/quartz';
const MARKETPLACE_ID = 'mathuransadagopan.quartz';

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(num);
}

async function fetchGitHubStars() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.stargazers_count;
  } catch {
    return null;
  }
}

async function fetchMarketplaceInstalls() {
  // VS Code Marketplace doesn't have a public JSON API.
  // We use the Open VSX API as a proxy, or fall back to null.
  try {
    const res = await fetch(
      `https://open-vsx.org/api/${MARKETPLACE_ID.replace('.', '/')}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.downloadCount || null;
  } catch {
    return null;
  }
}

export async function initStats() {
  const starsEl = document.getElementById('github-stars');
  const installsEl = document.getElementById('vscode-installs');

  const [stars, installs] = await Promise.all([
    fetchGitHubStars(),
    fetchMarketplaceInstalls(),
  ]);

  if (starsEl && stars !== null) {
    starsEl.textContent = formatNumber(stars);
  }

  if (installsEl && installs !== null) {
    installsEl.textContent = formatNumber(installs);
  }
}
