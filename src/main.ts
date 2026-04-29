import './style.css';

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

// --- State ---
let links: LinkItem[] = [];
let activeFilters: string[] = [];
let currentSort: string = 'newest';
let searchQuery: string = '';

// --- DOM Elements ---
const cardsGrid = document.getElementById('cards-grid') as HTMLElement;
const tagsFilterContainer = document.getElementById('tags-filter-container') as HTMLElement;
const itemCount = document.getElementById('item-count') as HTMLElement;

// Sidebar controls
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const importInput = document.getElementById('import-input') as HTMLInputElement;

// Modal elements
const modal = document.getElementById('entry-modal') as HTMLElement;
const modalTitle = document.getElementById('modal-title') as HTMLElement;
const linkForm = document.getElementById('link-form') as HTMLFormElement;
const addBtn = document.getElementById('add-btn') as HTMLButtonElement;
const closeModal = document.getElementById('close-modal') as HTMLButtonElement;
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

// --- Initialization ---
function init() {
  loadData();
  setupEventListeners();
  renderCards();
  renderTagsFilter();
}

// --- Local Storage ---
function loadData() {
  const data = localStorage.getItem('minicard_links');
  if (data) {
    try {
      links = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse data');
      links = [];
    }
  }
}

function saveData() {
  localStorage.setItem('minicard_links', JSON.stringify(links));
}

// --- Data Operations ---
function getFaviconUrl(url: string): string {
  if (!url) return 'https://via.placeholder.com/56/1e2130/ffffff?text=Link';
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return 'https://via.placeholder.com/56/1e2130/ffffff?text=Link';
  }
}

function handleSave(e: Event) {
  e.preventDefault();
  if (!linkForm.checkValidity()) {
    linkForm.reportValidity();
    return;
  }

  const id = idInput.value || Date.now().toString();
  const url = urlInput.value;
  const title = titleInput.value;
  const description = descInput.value;
  const notes = notesInput.value;
  const tagsStr = tagsInput.value;
  
  const tags = tagsStr.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const isAutoFavicon = autoFaviconSwitch.checked;
  // If editing and auto is off, keep old image, else fetch
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
    id,
    url,
    title,
    description,
    notes,
    tags,
    imageUrl,
    createdAt: existingLink ? existingLink.createdAt : Date.now()
  };

  if (existingLink) {
    links = links.map(l => l.id === id ? newLink : l);
  } else {
    links.push(newLink);
  }

  saveData();
  closeModalHandler();
  renderCards();
  renderTagsFilter();
}

function handleDelete() {
  const id = idInput.value;
  if (!id) return;
  if (confirm('Are you sure you want to delete this link?')) {
    links = links.filter(l => l.id !== id);
    saveData();
    closeModalHandler();
    renderCards();
    renderTagsFilter();
  }
}

// --- UI Rendering ---
function getFilteredAndSortedLinks(): LinkItem[] {
  let result = [...links];

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(l => 
      l.title.toLowerCase().includes(q) || 
      l.description.toLowerCase().includes(q) || 
      l.notes.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q)
    );
  }

  // Tags filter
  if (activeFilters.length > 0) {
    result = result.filter(l => activeFilters.every(tag => l.tags.includes(tag)));
  }

  // Sorting
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
    cardsGrid.innerHTML = `<div class="empty-state">No links found. Add a new one or clear filters!</div>`;
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
      <button class="card-edit-btn" title="Edit">✎</button>
    `;

    // Tooltip logic
    card.addEventListener('mouseenter', (e) => showTooltip(e, item));
    card.addEventListener('mouseleave', hideTooltip);
    card.addEventListener('mousemove', moveTooltip);

    // Edit logic overrides link behavior
    const editBtn = card.querySelector('.card-edit-btn');
    editBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditModal(item);
    });

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

// --- Tooltip Logic ---
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

  // bounds check
  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) {
    x = e.clientX - rect.width - offset;
  }
  if (y + rect.height > window.innerHeight) {
    y = e.clientY - rect.height - offset;
  }

  tooltip.style.left = `${Math.max(0, x)}px`;
  tooltip.style.top = `${Math.max(0, y)}px`;
}

function hideTooltip() {
  tooltip.classList.remove('visible');
  tooltip.classList.add('hidden');
}

// --- Modal Logic ---
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
  autoFaviconSwitch.checked = false; // default to false on edit, unless they want to update it
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

function importData(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string);
      if (Array.isArray(imported)) {
        links = imported;
        saveData();
        renderCards();
        renderTagsFilter();
        alert('Data imported successfully!');
      } else {
        alert('Invalid data format.');
      }
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = ''; // reset
}

// --- Event Listeners setup ---
function setupEventListeners() {
  addBtn.addEventListener('click', openAddModal);
  closeModal.addEventListener('click', closeModalHandler);
  cancelBtn.addEventListener('click', closeModalHandler);
  linkForm.addEventListener('submit', handleSave);
  deleteBtn.addEventListener('click', handleDelete);

  // Close modal on click outside
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
}

// Run app
init();
