// Import pages - summaries may not be available in dev mode
import { pages, summaries } from './content/pages.summary';

console.log(pages);

let currentLang = 'en';

// Fetch a specific page by language and id
async function getPage(lang, id) {
  const url = pages[lang]?.[id];
  if (!url) {
    throw new Error(`Page not found: ${lang}/${id}`);
  }
  const response = await fetch(url);
  return response.json();
}

// Fetch summary for a language
async function getSummary(lang) {
  const url = summaries?.[lang];
  if (!url) {
    return null;
  }
  const response = await fetch(url);
  return response.json();
}

function renderPagesList(summary) {
  const container = document.getElementById('pages-list');

  if (!summary?.items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No pages found for this language</p>
      </div>
    `;
    return;
  }

  container.innerHTML = summary.items.map(item => `
    <article class="page-card" onclick="loadPageDetail('${item.id}')">
      <span class="id">${item.id}</span>
      <h3>${item.title}</h3>
      <p class="date">Click to view details</p>
    </article>
  `).join('');
}

// Load and display page detail
window.loadPageDetail = async function(id) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  panel.classList.add('visible');
  content.innerHTML = '<div class="loading">Loading page</div>';

  try {
    const page = await getPage(currentLang, id);

    content.innerHTML = `
      <h2>${page.title || id}</h2>
      <div class="detail-content">
        ${page.content ? `<p>${page.content}</p>` : ''}
        ${page.meta?.description ? `<p><em>${page.meta.description}</em></p>` : ''}
      </div>
      <div class="detail-meta">
        <div class="meta-item">
          <label>ID</label>
          <span>${page.id || id}</span>
        </div>
        ${page.createdAt ? `
          <div class="meta-item">
            <label>Created</label>
            <span>${new Date(page.createdAt).toLocaleDateString()}</span>
          </div>
        ` : ''}
        ${page.meta?.keywords ? `
          <div class="meta-item">
            <label>Keywords</label>
            <span>${page.meta.keywords.join(', ')}</span>
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
  }
};

// Close detail panel
window.closeDetail = function() {
  document.getElementById('detail-panel').classList.remove('visible');
};

// Switch language
function switchLanguage(lang) {
  currentLang = lang;

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  closeDetail();
  loadSummary();
}

function loadSummary() {
  return getSummary(currentLang).then(summary => renderPagesList(summary));
}

// Initialize
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
});

loadSummary();

// Log available data for debugging
console.log('Available pages:', pages);
console.log('Available summaries:', summaries);
