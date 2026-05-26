import './style.css';

// --- Config ---
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// --- Types ---
interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  notes: string;
  tags: string[];
  imageUrl: string;
  createdAt: number;
}

// --- Auth helpers ---
function getToken(): string | null {
  return localStorage.getItem('mc_token');
}

function setToken(token: string) {
  localStorage.setItem('mc_token', token);
}

function clearToken() {
  localStorage.removeItem('mc_token');
}

function isAdmin(): boolean {
  return !!getToken();
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

// --- API ---
async function apiLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json() as { token: string };
  return data.token;
}

async function apiGetLinks(): Promise<LinkItem[]> {
  const res = await fetch(`${API_BASE}/links`);
  if (!res.ok) throw new Error('Failed to load links');
  return res.json() as Promise<LinkItem[]>;
}

async function apiSaveLink(link: LinkItem): Promise<void> {
  const res = await fetch(`${API_BASE}/links`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(link),
  });
  if (res.status === 401) { logout(); return; }
  if (!res.ok) throw new Error('Failed to save link');
}

async function apiDeleteLink(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/links/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (res.status === 401) { logout(); return; }
  if (!res.ok) throw new Error('Failed to delete link');
}

// --- State ---
let links: LinkItem[] = [];
let activeFilters: string[] = [];
let currentSort: string = 'newest';
let searchQuery: string = '';

// --- DOM: App ---
const cardsGrid = document.getElementById('cards-grid') as HTMLElement;
const tagsFilterContainer = document.getElementById('tags-filter-container') as HTMLElement;
const itemCount = document.getElementById('item-count') as HTMLElement;

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const importInput = document.getElementById('import-input') as HTMLInputElement;
const addBtn = document.getElementById('add-btn') as HTMLButtonElement;
const adminControls = document.getElementById('admin-controls') as HTMLElement;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

// Modal elements
const modal = document.getElementById('entry-modal') as HTMLElement;
const modalTitle = document.getElementById('modal-title') as HTMLElement;
const linkForm = document.getElementById('link-form') as HTMLFormElement;
const closeModalBtn = document.getElementById('close-modal') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;

// Form inputs
const idInput = document.getElementById('card-id') as HTMLInputElement;
const urlInput = document.getElementById('url') as HTMLInputElement;
const titleInput = document.getElementById('title') as HTMLInputElement;
const descInput = document.getElementById('description') as HTMLTextAreaElement;
const notesInput = document.getElementById('notes') as HTMLTextAreaElement;
const tagsInput = document.getElementById('tags') as HTMLInputElement;
const autoFaviconSwitch = document.getElementById('auto-favicon') as HTMLInputElement;
const customImageInput = document.getElementById('custom-image') as HTMLInputElement;

// Tooltip
const tooltip = document.getElementById('custom-tooltip') as HTMLElement;
const ttTitle = document.getElementById('tt-title') as HTMLElement;
const ttDesc = document.getElementById('tt-desc') as HTMLElement;
const ttNotes = document.getElementById('tt-notes') as HTMLElement;
const ttTags = document.getElementById('tt-tags') as HTMLElement;

// --- DOM: Login ---
const loginOverlay = document.getElementById('login-overlay') as HTMLElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginError = document.getElementById('login-error') as HTMLElement;
const loginUsername = document.getElementById('login-username') as HTMLInputElement;
const loginPassword = document.getElementById('login-password') as HTMLInputElement;

// --- Auth UI ---
function updateAdminUI() {
  if (isAdmin()) {
    adminControls.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    adminControls.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
  // Re-render cards to mostrare/nascondere pulsante edit
  renderCards();
}

function showLogin() {
  loginOverlay.classList.remove('hidden');
}

function hideLogin() {
  loginOverlay.classList.add('hidden');
  loginError.textContent = '';
  loginForm.reset();
}

function logout() {
  clearToken();
  hideLogin();
  updateAdminUI();
}

async function handleLogin(e: Event) {
  e.preventDefault();
  loginError.textContent = '';
  try {
    const token = await apiLogin(loginUsername.value, loginPassword.value);
    setToken(token);
    hideLogin();
    updateAdminUI();
  } catch {
    loginError.textContent = 'Username o password errati';
  }
}

// --- Initialization ---
async function init() {
  setupEventListeners();
  await loadData();
  renderCards();
  renderTagsFilter();
  updateAdminUI();
}

// --- Data ---
async function loadData() {
  try {
    links = await apiGetLinks();
  } catch (e) {
    console.error('Failed to load data', e);
    links = [];
  }
}

// --- Data Operations ---
function getFaviconUrl(url: string): string {
  if (!url) return 'https://via.placeholder.com/56/1e2130/ffffff?text=Link';
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return 'https://via.placeholder.com/56/1e2130/ffffff?text=Link';
  }
}

async function handleSave(e: Event) {
  e.preventDefault();
  if (!linkForm.checkValidity()) { linkForm.reportValidity(); return; }

  const id = idInput.value || Date.now().toString();
  const url = urlInput.value;
  const title = titleInput.value;
  const description = descInput.value;
  const notes = notesInput.value;
  const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
  const isAutoFavicon = autoFaviconSwitch.checked;

  let imageUrl = '';
  const existingLink = links.find(l => l.id === id);

  if (isAutoFavicon) {
    imageUrl = getFaviconUrl(url);
  } else if (customImageInput.value) {
    imageUrl = customImageInput.value;
  } else if (existingLink) {
    imageUrl = existingLink.imageUrl;
  } else {
    imageUrl = 'https://via.placeholder.com/56/1e2130/ffffff?text=Link';
  }

  const newLink: LinkItem = {
    id, url, title, description, notes, tags, imageUrl,
    createdAt: existingLink ? existingLink.createdAt : Date.now(),
  };

  await apiSaveLink(newLink);

  if (existingLink) {
    links = links.map(l => l.id === id ? newLink : l);
  } else {
    links.push(newLink);
  }

  closeModalHandler();
  renderCards();
  renderTagsFilter();
}

async function handleDelete() {
  const id = idInput.value;
  if (!id) return;
  if (confirm('Vuoi eliminare questo link?')) {
    await apiDeleteLink(id);
    links = links.filter(l => l.id !== id);
    closeModalHandler();
    renderCards();
    renderTagsFilter();
  }
}

// --- UI Rendering ---
function getFilteredAndSortedLinks(): LinkItem[] {
  let result = [...links];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.notes.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q)
    );
  }

  if (activeFilters.length > 0) {
    result = result.filter(l => activeFilters.every(tag => l.tags.includes(tag)));
  }

  result.sort((a, b) => {
    switch (currentSort) {
      case 'newest': return b.createdAt - a.createdAt;
      case 'oldest': return a.createdAt - b.createdAt;
      case 'a-z': return a.title.localeCompare(b.title);
      case 'z-a': return b.title.localeCompare(a.title);
      default: return 0;
    }
  });

  return result;
}

function renderCards() {
  const items = getFilteredAndSortedLinks();
  cardsGrid.innerHTML = '';
  itemCount.textContent = `${items.length} cards`;

  if (items.length === 0) {
    cardsGrid.innerHTML = `<div class="empty-state">Nessun link trovato.</div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('a');
    card.href = item.url;
    card.target = '_blank';
    card.className = 'mini-card';
    card.dataset.id = item.id;

    card.innerHTML = `
      <img src="${item.imageUrl}" alt="Icon" class="card-img" onerror="this.src='https://via.placeholder.com/56/1e2130/ffffff?text=Icon'" />
      <div class="card-title" title="${item.title}">${item.title}</div>
      ${isAdmin() ? `<button class="card-edit-btn" title="Edit">&#9998;</button>` : ''}
    `;

    card.addEventListener('mouseenter', (e) => showTooltip(e, item));
    card.addEventListener('mouseleave', hideTooltip);
    card.addEventListener('mousemove', moveTooltip);

    if (isAdmin()) {
      const editBtn = card.querySelector('.card-edit-btn');
      editBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditModal(item);
      });
    }

    cardsGrid.appendChild(card);
  });
}

function renderTagsFilter() {
  const allTags = new Set<string>();
  links.forEach(l => l.tags.forEach(t => allTags.add(t)));

  tagsFilterContainer.innerHTML = '';

  Array.from(allTags).sort().forEach(tag => {
    const chip = document.createElement('div');
    chip.className = `tag-chip ${activeFilters.includes(tag) ? 'active' : ''}`;
    chip.textContent = tag;
    chip.addEventListener('click', () => {
      if (activeFilters.includes(tag)) {
        activeFilters = activeFilters.filter(t => t !== tag);
      } else {
        activeFilters.push(tag);
      }
      renderTagsFilter();
      renderCards();
    });
    tagsFilterContainer.appendChild(chip);
  });
}

// --- Tooltip ---
function showTooltip(e: MouseEvent, item: LinkItem) {
  ttTitle.textContent = item.title;
  ttDesc.textContent = item.description || 'No description';
  ttNotes.textContent = item.notes ? `Note: ${item.notes}` : '';

  ttTags.innerHTML = '';
  item.tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'tag-chip';
    span.style.padding = '2px 6px';
    span.style.fontSize = '10px';
    span.textContent = t;
    ttTags.appendChild(span);
  });

  tooltip.classList.remove('hidden');
  tooltip.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e: MouseEvent) {
  const offset = 15;
  let x = e.clientX + offset;
  let y = e.clientY + offset;

  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
  if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - offset;

  tooltip.style.left = `${Math.max(0, x)}px`;
  tooltip.style.top = `${Math.max(0, y)}px`;
}

function hideTooltip() {
  tooltip.classList.remove('visible');
  tooltip.classList.add('hidden');
}

// --- Modal ---
function openAddModal() {
  linkForm.reset();
  idInput.value = '';
  customImageInput.value = '';
  modalTitle.textContent = 'Add New Link';
  deleteBtn.classList.add('hidden');
  autoFaviconSwitch.checked = true;
  modal.classList.remove('hidden');
}

function openEditModal(item: LinkItem) {
  linkForm.reset();
  idInput.value = item.id;
  urlInput.value = item.url;
  titleInput.value = item.title;
  descInput.value = item.description;
  notesInput.value = item.notes;
  tagsInput.value = item.tags.join(', ');
  customImageInput.value = '';
  modalTitle.textContent = 'Edit Link';
  deleteBtn.classList.remove('hidden');
  autoFaviconSwitch.checked = false;
  modal.classList.remove('hidden');
}

function closeModalHandler() {
  modal.classList.add('hidden');
}

// --- Export / Import ---
function exportData() {
  const dataStr = JSON.stringify(links, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `minicard_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string) as LinkItem[];
      if (!Array.isArray(imported)) { alert('Formato non valido.'); return; }
      for (const link of imported) {
        await apiSaveLink(link);
      }
      links = await apiGetLinks();
      renderCards();
      renderTagsFilter();
      alert('Dati importati con successo!');
    } catch {
      alert('Errore nel file JSON.');
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
}

// --- Event Listeners ---
function setupEventListeners() {
  addBtn.addEventListener('click', () => {
    if (!isAdmin()) { showLogin(); return; }
    openAddModal();
  });

  closeModalBtn.addEventListener('click', closeModalHandler);
  cancelBtn.addEventListener('click', closeModalHandler);
  linkForm.addEventListener('submit', handleSave);
  deleteBtn.addEventListener('click', handleDelete);

  loginBtn.addEventListener('click', showLogin);
  logoutBtn.addEventListener('click', logout);

  loginOverlay.addEventListener('click', (e) => {
    if (e.target === loginOverlay) hideLogin();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModalHandler();
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderCards();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = (e.target as HTMLSelectElement).value;
    renderCards();
  });

  exportBtn.addEventListener('click', exportData);
  importInput.addEventListener('change', importData);

  loginForm.addEventListener('submit', handleLogin);
}

init();
