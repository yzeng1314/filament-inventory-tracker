// Global state
let filaments = [];
let currentEditId = null;
let deleteFilamentId = null;
let customColorsCache = [];
let customTypesCache = [];

// DOM elements
const filamentGrid = document.getElementById('filamentGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const addFilamentBtn = document.getElementById('addFilamentBtn');
const filamentModal = document.getElementById('filamentModal');
const deleteModal = document.getElementById('deleteModal');
const filamentForm = document.getElementById('filamentForm');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');

// Stats elements
const totalFilaments = document.getElementById('totalFilaments');
const totalBrands = document.getElementById('totalBrands');
const totalWeight = document.getElementById('totalWeight');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFilaments();
    setupEventListeners();
    initializeColorOptions();
    setDefaultValues();
});

// Event listeners
function setupEventListeners() {
    addFilamentBtn.addEventListener('click', showAddModal);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    searchInput.addEventListener('input', (e) => {
        if (e.target.value === '') {
            loadFilaments();
        }
    });
    filamentForm.addEventListener('submit', handleFormSubmit);
    
    // Modal close on backdrop click
    filamentModal.addEventListener('click', (e) => {
        if (e.target === filamentModal) {
            closeModal();
        }
    });
    
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
    
    // Confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
}

// API functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

// Load filaments
async function loadFilaments() {
    try {
        showLoading(true);
        filaments = await apiCall('/filaments');
        renderFilaments(filaments);
        updateStats();
    } catch (error) {
        console.error('Failed to load filaments:', error);
    } finally {
        showLoading(false);
    }
}

// Search filaments
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        loadFilaments();
        return;
    }
    
    try {
        showLoading(true);
        const results = await apiCall(`/filaments/search?q=${encodeURIComponent(query)}`);
        renderFilaments(results);
        updateStats(results);
    } catch (error) {
        console.error('Search failed:', error);
    } finally {
        showLoading(false);
    }
}

// Render filaments
function renderFilaments(filamentsToRender) {
    if (filamentsToRender.length === 0) {
        filamentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    filamentGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    filamentGrid.innerHTML = filamentsToRender.map(filament => createFilamentCard(filament)).join('');
}

// Create filament card HTML
function createFilamentCard(filament) {
    const weightPercentage = Math.min((filament.weight_remaining / 1000) * 100, 100);
    const colorStyle = getColorStyleSync(filament.color);
    const purchaseDate = filament.purchase_date ? new Date(filament.purchase_date).toLocaleDateString() : 'Not specified';
    
    return `
        <div class="filament-card">
            <div class="filament-header">
                <div class="filament-title">
                    <div class="filament-brand">${escapeHtml(filament.brand)}</div>
                    <div class="filament-type">${escapeHtml(filament.type)}</div>
                </div>
                <div class="filament-actions">
                    <button class="btn btn-secondary btn-small" onclick="editFilament(${filament.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="showDeleteModal(${filament.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="filament-details">
                <div class="detail-row">
                    <span class="detail-label">Color:</span>
                    <span class="detail-value">
                        ${escapeHtml(filament.color)}
                        <span class="color-indicator" style="${colorStyle}"></span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Spool Type:</span>
                    <span class="detail-value">${filament.spool_type === 'with_spool' ? 'With Spool' : 'Refill Only'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Weight:</span>
                    <span class="detail-value">${filament.weight_remaining}g</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Purchase Date:</span>
                    <span class="detail-value">${purchaseDate}</span>
                </div>
                
                <div class="weight-bar">
                    <div class="weight-fill" style="width: ${weightPercentage}%"></div>
                </div>
            </div>
            
            ${filament.notes ? `
                <div class="filament-notes">
                    "${escapeHtml(filament.notes)}"
                </div>
            ` : ''}
        </div>
    `;
}

// Get color style for color indicator
function getColorStyle(color) {
    const colorMap = {
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'black': '#000000',
        'white': '#ffffff',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'transparent': 'rgba(255,255,255,0.3)',
        'clear': 'rgba(255,255,255,0.3)'
    };
    
    const normalizedColor = color.toLowerCase().trim();
    const backgroundColor = colorMap[normalizedColor] || '#cccccc';
    
    return `background-color: ${backgroundColor}; ${backgroundColor === '#ffffff' ? 'border-color: #999;' : ''}`;
}

// Update statistics
function updateStats(filamentsToCount = filaments) {
    const total = filamentsToCount.length;
    const brands = new Set(filamentsToCount.map(f => f.brand.toLowerCase())).size;
    const weight = filamentsToCount.reduce((sum, f) => sum + (f.weight_remaining || 0), 0);
    
    totalFilaments.textContent = total;
    totalBrands.textContent = brands;
    totalWeight.textContent = `${weight}g`;
}

// Modal functions
async function showAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Add New Filament';
    resetForm();
    
    // Ensure custom colors are loaded before showing modal
    await loadCustomBrandsAndColors();
    
    showModal();
}

function showModal() {
    filamentModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    filamentModal.classList.remove('show');
    document.body.style.overflow = '';
    resetForm();
}

function resetForm() {
    filamentForm.reset();
    document.getElementById('filamentId').value = '';
    currentEditId = null;
}

// Edit filament
async function editFilament(id) {
    try {
        const filament = await apiCall(`/filaments/${id}`);
        currentEditId = id;
        
        document.getElementById('modalTitle').textContent = 'Edit Filament';
        document.getElementById('filamentId').value = filament.id;
        document.getElementById('brand').value = filament.brand;
        document.getElementById('type').value = filament.type;
        document.getElementById('color').value = filament.color;
        document.getElementById('spoolType').value = filament.spool_type;
        document.getElementById('weightRemaining').value = filament.weight_remaining;
        document.getElementById('purchaseDate').value = filament.purchase_date || '';
        document.getElementById('notes').value = filament.notes || '';
        
        showModal();
    } catch (error) {
        console.error('Failed to load filament for editing:', error);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Handle custom color
    let colorValue = document.getElementById('color').value.trim();
    if (!colorValue) {
        const customColorName = document.getElementById('customColorName');
        const colorPicker = document.getElementById('colorPicker');
        
        if (customColorName && customColorName.value.trim()) {
            const customColorNameValue = customColorName.value.trim();
            const hexColor = colorPicker ? colorPicker.value : '#ff0000';
            
            // Add custom color to database
            try {
                await apiCall('/custom-colors', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        name: customColorNameValue,
                        hex_code: hexColor 
                    })
                });
                // Update dropdowns to include the new color
                await loadCustomBrandsAndColors();
            } catch (error) {
                // If it already exists, that's fine
                if (!error.message.includes('already exists')) {
                    console.error('Failed to add custom color:', error);
                    return;
                }
            }
            
            colorValue = customColorNameValue;
        } else {
            showToast('Please select a color', 'error');
            return;
        }
    }
    
    const formData = {
        brand: document.getElementById('brand').value.trim(),
        type: document.getElementById('type').value,
        color: colorValue,
        spool_type: document.getElementById('spoolType').value,
        weight_remaining: parseFloat(document.getElementById('weightRemaining').value) || 1000,
        purchase_date: document.getElementById('purchaseDate').value || null,
        notes: document.getElementById('notes').value.trim() || null
    };
    
    try {
        if (currentEditId) {
            await apiCall(`/filaments/${currentEditId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showToast('Filament updated successfully!', 'success');
        } else {
            await apiCall('/filaments', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showToast('Filament added successfully!', 'success');
        }
        
        closeModal();
        loadFilaments();
    } catch (error) {
        console.error('Failed to save filament:', error);
    }
}

// Delete functions
function showDeleteModal(id) {
    deleteFilamentId = id;
    const filament = filaments.find(f => f.id === id);
    
    if (filament) {
        document.getElementById('deletePreview').innerHTML = `
            <strong>${escapeHtml(filament.brand)} - ${escapeHtml(filament.type)}</strong><br>
            <small>Color: ${escapeHtml(filament.color)} | Weight: ${filament.weight_remaining}g</small>
        `;
    }
    
    deleteModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    deleteModal.classList.remove('show');
    document.body.style.overflow = '';
    deleteFilamentId = null;
}

async function confirmDelete() {
    if (!deleteFilamentId) return;
    
    try {
        await apiCall(`/filaments/${deleteFilamentId}`, {
            method: 'DELETE'
        });
        
        showToast('Filament deleted successfully!', 'success');
        closeDeleteModal();
        loadFilaments();
    } catch (error) {
        console.error('Failed to delete filament:', error);
    }
}

// Utility functions
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

function showToast(message, type = 'success') {
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modals
    if (e.key === 'Escape') {
        if (filamentModal.classList.contains('show')) {
            closeModal();
        }
        if (deleteModal.classList.contains('show')) {
            closeDeleteModal();
        }
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Ctrl/Cmd + N to add new filament
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddModal();
    }
});

// Service worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize color options with visual indicators
function initializeColorOptions() {
    // Load custom brands and colors
    loadCustomBrandsAndColors();
    
    // Initialize custom color dropdown
    initializeCustomColorDropdown();
}

// Initialize custom color dropdown
function initializeCustomColorDropdown() {
    const dropdown = document.getElementById('colorDropdown');
    const selected = document.getElementById('colorSelected');
    const options = document.getElementById('colorOptions');
    const hiddenInput = document.getElementById('color');
    const customColorContainer = document.getElementById('customColorContainer');
    
    // Toggle dropdown
    selected.addEventListener('click', function() {
        const isActive = selected.classList.contains('active');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-selected.active').forEach(el => {
            if (el !== selected) {
                el.classList.remove('active');
                el.nextElementSibling.classList.remove('show');
            }
        });
        
        if (isActive) {
            selected.classList.remove('active');
            options.classList.remove('show');
        } else {
            selected.classList.add('active');
            options.classList.add('show');
        }
    });
    
    // Handle option selection
    options.addEventListener('click', function(e) {
        // Check if the click was on an edit button
        if (e.target.closest('.edit-custom-color')) {
            e.stopPropagation();
            return; // Don't handle selection if clicking edit button
        }
        
        const option = e.target.closest('.dropdown-option');
        if (!option) return;
        
        const value = option.getAttribute('data-value');
        const color = option.getAttribute('data-color');
        const textElement = option.querySelector('span:last-child');
        const text = textElement ? textElement.textContent : option.textContent.replace('★', '').trim();
        
        console.log('Color option selected:', { value, color, text }); // Debug log
        
        // Update selected display
        if (value === 'custom') {
            selected.querySelector('.selected-text').textContent = 'Select color';
            hiddenInput.value = '';
            if (customColorContainer) {
                customColorContainer.style.display = 'block';
                const customColorName = document.getElementById('customColorName');
                if (customColorName) {
                    customColorName.focus();
                    customColorName.required = true;
                }
            }
        } else {
            const colorIndicator = option.querySelector('.color-indicator');
            const selectedText = selected.querySelector('.selected-text');
            
            selectedText.innerHTML = '';
            
            if (colorIndicator) {
                const clonedIndicator = colorIndicator.cloneNode(true);
                selectedText.appendChild(clonedIndicator);
                selectedText.appendChild(document.createTextNode(' ' + text));
            } else {
                selectedText.textContent = text;
            }
            
            hiddenInput.value = value;
            
            if (customColorContainer) {
                customColorContainer.style.display = 'none';
                const customColorName = document.getElementById('customColorName');
                if (customColorName) {
                    customColorName.required = false;
                }
            }
        }
        
        // Update selected state
        options.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Close dropdown
        selected.classList.remove('active');
        options.classList.remove('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            selected.classList.remove('active');
            options.classList.remove('show');
        }
    });
}

// Load custom brands, colors, and types from database
async function loadCustomBrandsAndColors() {
    try {
        const [customBrands, customColors, customTypes] = await Promise.all([
            apiCall('/custom-brands'),
            apiCall('/custom-colors'),
            apiCall('/custom-types')
        ]);
        
        // Cache custom colors and types for synchronous access
        customColorsCache = customColors;
        customTypesCache = customTypes;
        
        updateBrandDropdown(customBrands);
        updateColorDropdown(customColors);
        updateTypeDropdown(customTypes);
    } catch (error) {
        console.error('Failed to load custom options:', error);
    }
}

// Update brand dropdown with custom brands
function updateBrandDropdown(customBrands) {
    const brandSelect = document.getElementById('brand');
    const customOption = brandSelect.querySelector('option[value="custom"]');
    
    // Remove existing custom brand options
    const existingCustom = brandSelect.querySelectorAll('.custom-brand-option');
    existingCustom.forEach(option => option.remove());
    
    // Add custom brands before the "Add Custom" option
    customBrands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.name;
        option.textContent = `★ ${brand.name}`;
        option.className = 'custom-brand-option custom-option';
        brandSelect.insertBefore(option, customOption);
    });
}

// Update color dropdown with custom colors
function updateColorDropdown(customColors) {
    const colorOptions = document.getElementById('colorOptions');
    const customOption = colorOptions.querySelector('[data-value="custom"]');
    
    // Remove existing custom color options
    const existingCustom = colorOptions.querySelectorAll('.custom-color-option');
    existingCustom.forEach(option => option.remove());
    
    // Add custom colors before the "Add Custom" option
    customColors.forEach(color => {
        const option = document.createElement('div');
        option.className = 'dropdown-option custom-color-option custom-option';
        option.setAttribute('data-value', color.name);
        option.setAttribute('data-color', color.hex_code);
        option.innerHTML = `
            <span class="color-indicator" style="background-color: ${color.hex_code}; ${color.hex_code === '#ffffff' ? 'border-color: #999;' : ''}"></span>
            <span>★ ${color.name}</span>
        `;
        colorOptions.insertBefore(option, customOption);
    });
}

// Update type dropdown with custom types
function updateTypeDropdown(customTypes) {
    const typeSelect = document.getElementById('type');
    const customOption = typeSelect.querySelector('option[value="custom"]');
    
    // Remove existing custom type options
    const existingCustom = typeSelect.querySelectorAll('.custom-type-option');
    existingCustom.forEach(option => option.remove());
    
    // Add custom types before the "Add Custom" option
    customTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.name;
        option.textContent = `★ ${type.name}`;
        option.className = 'custom-type-option custom-option';
        typeSelect.insertBefore(option, customOption);
    });
}

// Style color options with visual indicators
function styleColorOptions() {
    const colorSelect = document.getElementById('color');
    const colorOptions = colorSelect.querySelectorAll('option[data-color]');
    
    colorOptions.forEach(option => {
        const color = option.getAttribute('data-color');
        if (color) {
            // Clean up the text and set CSS custom property for color
            const colorName = option.textContent.replace('●', '').replace('★', '').trim();
            option.textContent = colorName;
            option.style.setProperty('--option-color', color);
            option.style.paddingLeft = '30px';
            
            // Create a visual color indicator using background
            option.style.background = `linear-gradient(90deg, ${color} 20px, transparent 20px)`;
            option.style.backgroundRepeat = 'no-repeat';
            option.style.backgroundPosition = '8px center';
            option.style.backgroundSize = '12px 12px';
            
            // Add border for white/light colors
            if (color === '#ffffff' || color.toLowerCase() === 'white') {
                option.style.backgroundImage = `radial-gradient(circle at 8px center, ${color} 5px, #999 5px, #999 6px, transparent 6px)`;
            }
        }
    });
}

// Set default values for the form
function setDefaultValues() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    
    // Set default weight
    document.getElementById('weightRemaining').value = '1000';
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        brand: document.getElementById('brand').value.trim(),
        type: document.getElementById('type').value,
        color: document.getElementById('color').value.trim(),
        spool_type: document.getElementById('spoolType').value,
        weight_remaining: parseFloat(document.getElementById('weightRemaining').value) || 1000,
        purchase_date: document.getElementById('purchaseDate').value || null,
        notes: document.getElementById('notes').value.trim() || null
    };
    
    try {
        if (currentEditId) {
            await apiCall(`/filaments/${currentEditId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showToast('Filament updated successfully!', 'success');
        } else {
            await apiCall('/filaments', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showToast('Filament added successfully!', 'success');
        }
        
        closeModal();
        loadFilaments();
    } catch (error) {
        console.error('Failed to save filament:', error);
    }
}

// Enhanced reset form to handle custom inputs and defaults
function resetForm() {
    filamentForm.reset();
    document.getElementById('filamentId').value = '';
    currentEditId = null;
    
    // Hide custom inputs (only if they exist)
    const customBrand = document.getElementById('customBrand');
    const customColorContainer = document.getElementById('customColorContainer');
    const customColorName = document.getElementById('customColorName');
    const colorPicker = document.getElementById('colorPicker');
    const colorHex = document.getElementById('colorHex');
    const customTypeContainer = document.getElementById('customType');
    const customTypeName = document.getElementById('customTypeName');
    
    if (customBrand) {
        customBrand.style.display = 'none';
        customBrand.required = false;
        customBrand.value = '';
    }
    
    if (customColorContainer) {
        customColorContainer.style.display = 'none';
    }
    
    if (customColorName) {
        customColorName.required = false;
        customColorName.value = '';
    }
    
    if (colorPicker) {
        colorPicker.value = '#ff0000';
    }
    
    if (colorHex) {
        colorHex.value = '';
    }
    
    if (customTypeContainer) {
        customTypeContainer.style.display = 'none';
    }
    
    if (customTypeName) {
        customTypeName.required = false;
        customTypeName.value = '';
    }
    
    // Reset color dropdown to default state
    const colorSelected = document.getElementById('colorSelected');
    const hiddenColorInput = document.getElementById('color');
    if (colorSelected) {
        colorSelected.querySelector('.selected-text').textContent = 'Select color';
    }
    if (hiddenColorInput) {
        hiddenColorInput.value = '';
    }
    
    // Reset to defaults
    setDefaultValues();
    
    // Reset to default selections
    document.getElementById('brand').value = 'Bambu Lab';
    document.getElementById('type').value = 'PLA';
}

// Enhanced edit function to handle custom values
async function editFilament(id) {
    try {
        const filament = await apiCall(`/filaments/${id}`);
        currentEditId = id;
        
        // Ensure custom colors are loaded before editing
        await loadCustomBrandsAndColors();
        
        document.getElementById('modalTitle').textContent = 'Edit Filament';
        document.getElementById('filamentId').value = filament.id;
        
        // Handle brand (check if it's in the dropdown)
        const brandSelect = document.getElementById('brand');
        const brandOptions = Array.from(brandSelect.options).map(opt => opt.value);
        if (brandOptions.includes(filament.brand)) {
            brandSelect.value = filament.brand;
        } else {
            brandSelect.value = 'custom';
            document.getElementById('customBrand').style.display = 'block';
            document.getElementById('customBrand').value = filament.brand;
            document.getElementById('customBrand').required = true;
        }
        
        document.getElementById('type').value = filament.type;
        
        // Handle color with custom dropdown
        const colorOptions = document.getElementById('colorOptions');
        const colorSelected = document.getElementById('colorSelected');
        const hiddenColorInput = document.getElementById('color');
        const customColorContainer = document.getElementById('customColorContainer');
        
        // Check if color exists in dropdown options
        const colorOption = colorOptions.querySelector(`[data-value="${filament.color}"]`);
        if (colorOption) {
            // Color exists in dropdown - select it
            const colorIndicator = colorOption.querySelector('.color-indicator');
            const textSpan = colorOption.querySelector('span:last-child');
            const text = textSpan ? textSpan.textContent : colorOption.textContent.replace('★', '').trim();
            
            colorSelected.querySelector('.selected-text').innerHTML = '';
            if (colorIndicator) {
                const clonedIndicator = colorIndicator.cloneNode(true);
                colorSelected.querySelector('.selected-text').appendChild(clonedIndicator);
            }
            colorSelected.querySelector('.selected-text').appendChild(document.createTextNode(' ' + text));
            hiddenColorInput.value = filament.color;
            
            if (customColorContainer) {
                customColorContainer.style.display = 'none';
                const customColorName = document.getElementById('customColorName');
                if (customColorName) {
                    customColorName.required = false;
                }
            }
            
            // Update selected state
            colorOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
            colorOption.classList.add('selected');
        } else {
            // Color doesn't exist in predefined options - it's a custom color
            // Set the color value directly and show it as selected
            hiddenColorInput.value = filament.color;
            
            // Try to find the color in custom colors cache to get hex code
            const customColor = customColorsCache.find(c => c.name.toLowerCase() === filament.color.toLowerCase());
            if (customColor) {
                // It's a known custom color - display it properly
                colorSelected.querySelector('.selected-text').innerHTML = `
                    <span class="color-indicator" style="background-color: ${customColor.hex_code}; ${customColor.hex_code === '#ffffff' ? 'border-color: #999;' : ''}"></span>
                    ★ ${filament.color}
                `;
            } else {
                // Unknown color - just display the name
                colorSelected.querySelector('.selected-text').textContent = filament.color;
            }
            
            if (customColorContainer) {
                customColorContainer.style.display = 'none';
                const customColorName = document.getElementById('customColorName');
                if (customColorName) {
                    customColorName.required = false;
                }
            }
            
            // Clear selected state from all options
            colorOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
        }
        
        document.getElementById('spoolType').value = filament.spool_type;
        document.getElementById('weightRemaining').value = filament.weight_remaining;
        document.getElementById('purchaseDate').value = filament.purchase_date || '';
        document.getElementById('notes').value = filament.notes || '';
        
        showModal();
    } catch (error) {
        console.error('Failed to load filament for editing:', error);
    }
}

// Enhanced color style function with custom colors support
async function getColorStyle(color) {
    const colorMap = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'silver': '#c0c0c0',
        'gold': '#ffd700',
        'transparent': 'rgba(255,255,255,0.3)',
        'clear': 'rgba(255,255,255,0.3)',
        'natural': '#f5f5dc',
        'glow in dark': '#90ee90',
        'wood': '#deb887',
        'marble': '#f0f8ff',
        'carbon fiber': '#36454f'
    };
    
    const normalizedColor = color.toLowerCase().trim();
    
    // First check predefined colors
    if (colorMap[normalizedColor]) {
        const backgroundColor = colorMap[normalizedColor];
        return `background-color: ${backgroundColor}; ${backgroundColor === '#ffffff' ? 'border-color: #999;' : ''}`;
    }
    
    // Check custom colors from database
    try {
        const customColors = await apiCall('/custom-colors');
        const customColor = customColors.find(c => c.name.toLowerCase() === normalizedColor);
        if (customColor) {
            return `background-color: ${customColor.hex_code}; ${customColor.hex_code === '#ffffff' ? 'border-color: #999;' : ''}`;
        }
    } catch (error) {
        console.error('Failed to load custom colors for styling:', error);
    }
    
    // Default fallback
    return 'background-color: #cccccc;';
}

// Synchronous version for immediate use
function getColorStyleSync(color) {
    const colorMap = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'silver': '#c0c0c0',
        'gold': '#ffd700',
        'transparent': 'rgba(255,255,255,0.3)',
        'clear': 'rgba(255,255,255,0.3)',
        'natural': '#f5f5dc',
        'glow in dark': '#90ee90',
        'wood': '#deb887',
        'marble': '#f0f8ff',
        'carbon fiber': '#36454f'
    };
    
    const normalizedColor = color.toLowerCase().trim();
    
    // First check predefined colors
    if (colorMap[normalizedColor]) {
        const backgroundColor = colorMap[normalizedColor];
        return `background-color: ${backgroundColor}; ${backgroundColor === '#ffffff' ? 'border-color: #999;' : ''}`;
    }
    
    // Check cached custom colors
    const customColor = customColorsCache.find(c => c.name.toLowerCase() === normalizedColor);
    if (customColor) {
        const backgroundColor = customColor.hex_code;
        return `background-color: ${backgroundColor}; ${backgroundColor === '#ffffff' ? 'border-color: #999;' : ''}`;
    }
    
    // Default fallback
    return 'background-color: #cccccc;';
}

// Edit custom color function
function editCustomColor(colorName, hexCode) {
    // Prevent event bubbling
    event.stopPropagation();
    
    // Set the form to custom color mode
    const colorSelect = document.getElementById('color');
    const customColorContainer = document.getElementById('customColorContainer');
    const customColorName = document.getElementById('customColorName');
    const colorPicker = document.getElementById('colorPicker');
    const colorHex = document.getElementById('colorHex');
    
    // Show custom color inputs
    customColorContainer.style.display = 'block';
    customColorName.value = colorName;
    colorPicker.value = hexCode;
    colorHex.value = hexCode;
    customColorName.required = true;
    
    // Update the dropdown display
    const selected = document.getElementById('colorSelected');
    selected.querySelector('.selected-text').textContent = 'Edit Custom Color';
    document.getElementById('color').value = '';
    
    // Close dropdown
    selected.classList.remove('active');
    document.getElementById('colorOptions').classList.remove('show');
    
    showToast('Editing custom color. Modify and save to update.', 'success');
}

// Add management interface for custom brands and colors
function showManageCustomsModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal" id="manageCustomsModal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Manage Custom Brands, Colors & Types</h2>
                    <button class="close-btn" onclick="closeManageCustomsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1;">
                            <h3>Custom Brands</h3>
                            <div class="form-group">
                                <input type="text" id="newBrandName" placeholder="Enter brand name" style="width: 100%; margin-bottom: 10px;">
                                <button type="button" class="btn btn-primary btn-small" onclick="addCustomBrand()">
                                    <i class="fas fa-plus"></i> Add Brand
                                </button>
                            </div>
                            <div id="customBrandsList"></div>
                        </div>
                        <div style="flex: 1;">
                            <h3>Custom Types</h3>
                            <div class="form-group">
                                <input type="text" id="newTypeName" placeholder="Enter type name" style="width: 100%; margin-bottom: 10px;">
                                <button type="button" class="btn btn-primary btn-small" onclick="addCustomType()">
                                    <i class="fas fa-plus"></i> Add Type
                                </button>
                            </div>
                            <div id="customTypesList"></div>
                        </div>
                        <div style="flex: 1;">
                            <h3>Custom Colors</h3>
                            <div class="form-group">
                                <input type="text" id="newColorName" placeholder="Enter color name" style="width: 100%; margin-bottom: 10px;">
                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <input type="color" id="newColorPicker" value="#ff0000" style="width: 50px; height: 35px;">
                                    <input type="text" id="newColorHex" placeholder="#FF0000" maxlength="7" pattern="^#[0-9A-Fa-f]{6}$" style="flex: 1;">
                                </div>
                                <button type="button" class="btn btn-primary btn-small" onclick="addCustomColor()">
                                    <i class="fas fa-plus"></i> Add Color
                                </button>
                            </div>
                            <div id="customColorsList"></div>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeManageCustomsModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page if it doesn't exist
    if (!document.getElementById('manageCustomsModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners for color picker sync
        const colorPicker = document.getElementById('newColorPicker');
        const colorHex = document.getElementById('newColorHex');
        
        colorPicker.addEventListener('input', function() {
            colorHex.value = this.value.toUpperCase();
        });
        
        colorHex.addEventListener('input', function() {
            const hex = this.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                colorPicker.value = hex;
            }
        });
    }
    
    loadCustomManagementData();
    document.getElementById('manageCustomsModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeManageCustomsModal() {
    const modal = document.getElementById('manageCustomsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function loadCustomManagementData() {
    try {
        const [customBrands, customTypes, customColors] = await Promise.all([
            apiCall('/custom-brands'),
            apiCall('/custom-types'),
            apiCall('/custom-colors')
        ]);
        
        // Render custom brands
        const brandsList = document.getElementById('customBrandsList');
        brandsList.innerHTML = customBrands.map(brand => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px;">
                <span>★ ${escapeHtml(brand.name)}</span>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-small" onclick="editCustomBrand('${brand.name}')" title="Edit Brand">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCustomBrand('${brand.name}')" title="Delete Brand">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p style="color: #666; font-style: italic;">No custom brands</p>';
        
        // Render custom types
        const typesList = document.getElementById('customTypesList');
        typesList.innerHTML = customTypes.map(type => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px;">
                <span>★ ${escapeHtml(type.name)}</span>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-small" onclick="editCustomType('${type.name}')" title="Edit Type">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCustomType('${type.name}')" title="Delete Type">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p style="color: #666; font-style: italic;">No custom types</p>';
        
        // Render custom colors
        const colorsList = document.getElementById('customColorsList');
        colorsList.innerHTML = customColors.map(color => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="color-indicator" style="background-color: ${color.hex_code}; ${color.hex_code === '#ffffff' ? 'border-color: #999;' : ''}"></span>
                    <span>★ ${escapeHtml(color.name)}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary btn-small" onclick="editCustomColorInPanel('${color.name}', '${color.hex_code}')" title="Edit Color">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCustomColor('${color.name}')" title="Delete Color">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p style="color: #666; font-style: italic;">No custom colors</p>';
        
    } catch (error) {
        console.error('Failed to load custom management data:', error);
    }
}

async function deleteCustomBrand(brandName) {
    if (!confirm(`Are you sure you want to delete the custom brand "${brandName}"?`)) {
        return;
    }
    
    try {
        await apiCall(`/custom-brands/${encodeURIComponent(brandName)}`, {
            method: 'DELETE'
        });
        
        showToast('Custom brand deleted successfully!', 'success');
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to delete custom brand:', error);
        showToast('Failed to delete custom brand', 'error');
    }
}

async function deleteCustomColor(colorName) {
    if (!confirm(`Are you sure you want to delete the custom color "${colorName}"?`)) {
        return;
    }
    
    try {
        await apiCall(`/custom-colors/${encodeURIComponent(colorName)}`, {
            method: 'DELETE'
        });
        
        showToast('Custom color deleted successfully!', 'success');
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to delete custom color:', error);
        showToast('Failed to delete custom color', 'error');
    }
}

async function addCustomBrand() {
    const brandName = document.getElementById('newBrandName').value.trim();
    
    if (!brandName) {
        showToast('Please enter a brand name', 'error');
        return;
    }
    
    try {
        await apiCall('/custom-brands', {
            method: 'POST',
            body: JSON.stringify({ name: brandName })
        });
        
        showToast('Custom brand added successfully!', 'success');
        document.getElementById('newBrandName').value = '';
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to add custom brand:', error);
        showToast('Failed to add custom brand', 'error');
    }
}

async function addCustomColor() {
    const colorName = document.getElementById('newColorName').value.trim();
    const colorHex = document.getElementById('newColorHex').value || document.getElementById('newColorPicker').value;
    
    if (!colorName) {
        showToast('Please enter a color name', 'error');
        return;
    }
    
    if (!colorHex || !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
        showToast('Please select a valid color', 'error');
        return;
    }
    
    try {
        await apiCall('/custom-colors', {
            method: 'POST',
            body: JSON.stringify({ 
                name: colorName,
                hex_code: colorHex 
            })
        });
        
        showToast('Custom color added successfully!', 'success');
        document.getElementById('newColorName').value = '';
        document.getElementById('newColorHex').value = '';
        document.getElementById('newColorPicker').value = '#ff0000';
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to add custom color:', error);
        showToast('Failed to add custom color', 'error');
    }
}

async function addCustomType() {
    const typeName = document.getElementById('newTypeName').value.trim();
    
    if (!typeName) {
        showToast('Please enter a type name', 'error');
        return;
    }
    
    try {
        await apiCall('/custom-types', {
            method: 'POST',
            body: JSON.stringify({ name: typeName })
        });
        
        showToast('Custom type added successfully!', 'success');
        document.getElementById('newTypeName').value = '';
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to add custom type:', error);
        showToast('Failed to add custom type', 'error');
    }
}

async function deleteCustomType(typeName) {
    if (!confirm(`Are you sure you want to delete the custom type "${typeName}"?`)) {
        return;
    }
    
    try {
        await apiCall(`/custom-types/${encodeURIComponent(typeName)}`, {
            method: 'DELETE'
        });
        
        showToast('Custom type deleted successfully!', 'success');
        loadCustomManagementData();
        loadCustomBrandsAndColors(); // Refresh dropdowns
    } catch (error) {
        console.error('Failed to delete custom type:', error);
        showToast('Failed to delete custom type', 'error');
    }
}

// Show edit brand modal
function editCustomBrand(brandName) {
    showEditModal('brand', brandName, '', '');
}

// Show edit type modal
function editCustomType(typeName) {
    showEditModal('type', typeName, '', '');
}

// Show edit color modal
function editCustomColorInPanel(colorName, hexCode) {
    showEditModal('color', colorName, hexCode, '');
}

// Generic edit modal function
function showEditModal(itemType, currentName, currentHex = '', currentExtra = '') {
    const modalHTML = `
        <div class="modal" id="editCustomModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Edit Custom ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}</h2>
                    <button class="close-btn" onclick="closeEditModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="editCustomForm">
                        <div class="form-group">
                            <label for="editItemName">${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Name:</label>
                            <input type="text" id="editItemName" value="${escapeHtml(currentName)}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        ${itemType === 'color' ? `
                            <div class="form-group">
                                <label for="editItemHex">Color:</label>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <input type="color" id="editItemColorPicker" value="${currentHex}" style="width: 50px; height: 40px; border: none; border-radius: 4px; cursor: pointer;">
                                    <input type="text" id="editItemHex" value="${currentHex}" placeholder="#FF0000" maxlength="7" pattern="^#[0-9A-Fa-f]{6}$" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                            </div>
                        ` : ''}
                    </form>
                </div>
                <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; padding: 15px; border-top: 1px solid #eee;">
                    <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveEditedItem('${itemType}', '${escapeHtml(currentName)}')">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('editCustomModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners for color picker sync (if color type)
    if (itemType === 'color') {
        const colorPicker = document.getElementById('editItemColorPicker');
        const colorHex = document.getElementById('editItemHex');
        
        colorPicker.addEventListener('input', function() {
            colorHex.value = this.value.toUpperCase();
        });
        
        colorHex.addEventListener('input', function() {
            const hex = this.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                colorPicker.value = hex;
            }
        });
    }
    
    // Show modal
    document.getElementById('editCustomModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focus on name input
    document.getElementById('editItemName').focus();
    document.getElementById('editItemName').select();
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editCustomModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(() => modal.remove(), 300);
    }
}

// Save edited item
async function saveEditedItem(itemType, originalName) {
    const newName = document.getElementById('editItemName').value.trim();
    
    if (!newName) {
        showToast(`Please enter a ${itemType} name`, 'error');
        return;
    }
    
    let requestBody = { newName };
    
    // Handle color-specific fields
    if (itemType === 'color') {
        const newHex = document.getElementById('editItemHex').value;
        if (!newHex || !/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
            showToast('Please enter a valid hex color code (e.g., #FF0000)', 'error');
            return;
        }
        requestBody.newHexCode = newHex;
        
        // Check if no changes were made
        const originalHex = document.getElementById('editItemColorPicker').defaultValue;
        if (newName === originalName && newHex === originalHex) {
            closeEditModal();
            return;
        }
    } else {
        // Check if no changes were made for brand/type
        if (newName === originalName) {
            closeEditModal();
            return;
        }
    }
    
    try {
        const endpoint = itemType === 'brand' ? 'custom-brands' : 
                        itemType === 'type' ? 'custom-types' : 'custom-colors';
        
        const result = await apiCall(`/${endpoint}/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            body: JSON.stringify(requestBody)
        });
        
        showToast(`Custom ${itemType} updated successfully! ${result.filamentsUpdated} filaments updated.`, 'success');
        closeEditModal();
        
        // Refresh all data and UI components
        await loadCustomManagementData();
        await loadCustomBrandsAndColors(); // Refresh dropdowns and cache
        await loadFilaments(); // Refresh filament list to show updated data
    } catch (error) {
        console.error(`Failed to update custom ${itemType}:`, error);
        showToast(`Failed to update custom ${itemType}`, 'error');
    }
}

// Export functions for global access
window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.editFilament = editFilament;
window.showDeleteModal = showDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.editCustomColor = editCustomColor;
window.editCustomBrand = editCustomBrand;
window.editCustomType = editCustomType;
window.editCustomColorInPanel = editCustomColorInPanel;
window.showEditModal = showEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedItem = saveEditedItem;
window.showManageCustomsModal = showManageCustomsModal;
window.closeManageCustomsModal = closeManageCustomsModal;
window.addCustomBrand = addCustomBrand;
window.addCustomType = addCustomType;
window.addCustomColor = addCustomColor;
window.deleteCustomBrand = deleteCustomBrand;
window.deleteCustomType = deleteCustomType;
window.deleteCustomColor = deleteCustomColor;
