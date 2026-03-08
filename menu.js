// ═══════════════════════════════════════════════════════════════════════════════
 // 5G EATERY - PUBLIC MENU PAGE
// Displays menu items from database, allows adding to cart
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

let cart = [];
let allMenuItems = [];
let allCategories = [];
let currentSort = 'name-asc';
let currentFilter = 'all';

// Load cart from localStorage
function loadCart() {
  const saved = localStorage.getItem('5g-eatery-cart');
  cart = saved ? JSON.parse(saved) : [];
  updateCartBadge();
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('5g-eatery-cart', JSON.stringify(cart));
  updateCartBadge();
}

// Update cart badge count
function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Initialize page
async function initMenuPage() {
  try {
    loadCart();
    await fetchMenuData();
    renderFilters();
    renderMenuItems();

    // Check for standalone mode and request permission
    if (window.matchMedia('(display-mode: standalone)').matches) {
      requestNotificationPermission();
    }
  } catch (error) {
    console.error('Menu initialization failed:', error);
    showNotification('Failed to load menu', 'error');
  }
}

// Fetch menu data from database
async function fetchMenuData() {
  try {
    // Fetch categories
    const { data: categories, error: catError } = await supabaseClient
      .from('categories')
      .select('*')
      .order('name');
    if (catError) throw catError;
    allCategories = categories || [];

    // Fetch menu items
    const { data: items, error: itemError } = await supabaseClient
      .from('menu_items')
      .select('*, menu_item_variants(*)')
      .eq('available', true)
      .order('name');
    if (itemError) throw itemError;
    allMenuItems = items || [];
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    throw error;
  }
}

// Render filter buttons
function renderFilters() {
  const filterContainer = document.getElementById('filterButtons');
  if (!filterContainer) return;

  filterContainer.innerHTML = '';

  // Create "All" button
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.dataset.filter = 'all';
  allBtn.setAttribute('aria-pressed', 'true');
  allBtn.addEventListener('click', (e) => filterMenu('all', e.target));
  filterContainer.appendChild(allBtn);

  // show only three buttons by default, reveal fourth+ via toggle
  const maxVisible = 3;
  allCategories.forEach((cat, idx) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    if (idx >= maxVisible) {
      btn.classList.add('optional');
      btn.style.display = 'none';
    }
    btn.textContent = cat.name;
    btn.dataset.filter = cat.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', (e) => filterMenu(cat.id, e.target));
    filterContainer.appendChild(btn);
  });
  
  if (allCategories.length > maxVisible) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'filter-btn btn-more-filters';
    toggleBtn.textContent = 'See All';
    toggleBtn.addEventListener('click', () => {
      const isExpanded = filterContainer.classList.toggle('expanded');
      toggleBtn.textContent = isExpanded ? 'Show Less' : 'See All';
      filterContainer.querySelectorAll('.filter-btn.optional').forEach(b => {
        b.style.display = isExpanded ? 'inline-block' : 'none';
      });
    });
    filterContainer.appendChild(toggleBtn);
  }
}

// Filter menu by category
function filterMenu(categoryId, btnElement) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  
  const target = btnElement || event.target;
  if (target) {
    target.classList.add('active');
    target.setAttribute('aria-pressed', 'true');
  }

  // Store current filter
  currentFilter = categoryId;

  // Filter and render
  const filtered = categoryId === 'all'
    ? allMenuItems
    : allMenuItems.filter(item => item.category_id === categoryId);

  renderMenuItems(filtered);
}

// Render menu items
function renderMenuItems(items = allMenuItems) {
  const container = document.getElementById('menuContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:4rem 1rem;">
        <div style="font-size:2.5rem; margin-bottom:1rem; opacity:0.3;">🍽️</div>
        <p style="color:var(--text-secondary); font-family:'Rajdhani',sans-serif; font-size:1.1rem; letter-spacing:2px; text-transform:uppercase;">No items found</p>
      </div>`;
    return;
  }

  items.forEach((item, index) => {
    const cat = allCategories.find(c => c.id === item.category_id);

    // Handle variants
    const variants = item.menu_item_variants || [];
    variants.sort((a, b) => a.price - b.price);
    const hasVariants = variants.length > 0;
    const basePrice = hasVariants ? variants[0].price : item.price;

    const div = document.createElement('div');
    div.className = 'menu-card';
    div.style.animationDelay = `${index * 60}ms`;
    div.setAttribute('role', 'article');
    div.setAttribute('aria-label', `${item.name}, ${Number(basePrice).toLocaleString()} naira${cat ? ', ' + cat.name : ''}`);

    const imageUrl = item.image_url || 'logo.png';
    const altText = `${item.name} menu item${cat ? ' - ' + cat.name : ''}`;

    // Variant selector HTML
    let variantHtml = '';
    if (hasVariants) {
      variantHtml = `
        <div class="variant-wrapper">
          <svg class="variant-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          <select class="variant-select" id="var-${item.id}" onchange="updateCardQuantityAndPrice('${item.id}', 0)">
            ${variants.map(v => `<option value="${v.id}" data-price="${v.price}">${v.name} — ₦${Number(v.price).toLocaleString()}</option>`).join('')}
          </select>
        </div>`;
    }

    // Category badge icon (signal bars for the 5G theme)
    const catBadge = cat ? `
      <span class="menu-card-category" aria-label="Category">
        <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor">
          <rect x="1" y="14" width="3" height="6" rx="1"/><rect x="7" y="10" width="3" height="10" rx="1"/><rect x="13" y="6" width="3" height="14" rx="1"/><rect x="19" y="2" width="3" height="18" rx="1"/>
        </svg>
        ${cat.name}
      </span>` : '';

    div.innerHTML = `
      <div class="menu-card-image-wrapper">
        <img src="${imageUrl}" alt="${altText}" class="menu-card-image" loading="lazy" decoding="async">
        ${catBadge}
        <div class="image-overlay">
          <button class="overlay-order-btn" onclick="addToCartWithQty('${item.id}', '${item.name.replace(/'/g,"\\'")}', ${basePrice}, 'qty-${item.id}')" aria-label="Quick add ${item.name}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Quick Add
          </button>
        </div>
      </div>

      <div class="menu-card-content">
        <div class="menu-card-body">
          <h3 class="menu-card-title">${item.name}</h3>
          <p class="menu-card-desc">${item.description || 'Premium menu item'}</p>
        </div>

        <div class="menu-card-footer">
          ${variantHtml}
          <div class="menu-card-actions">
            <div class="price-qty-row">
              <div class="price-block">
                <span class="price-label">PRICE</span>
                <span class="menu-card-price" id="price-${item.id}" data-base-price="${basePrice}" aria-label="Price">₦${Number(basePrice).toLocaleString()}</span>
              </div>
              <div class="qty-selector" id="qty-${item.id}">
                <button class="qty-btn qty-minus" onclick="updateCardQuantityAndPrice('${item.id}', -1)" aria-label="Decrease quantity">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <input type="number" class="qty-input" value="1" min="1" max="99" oninput="updateCardQuantityAndPrice('${item.id}', 0)" aria-label="Quantity">
                <button class="qty-btn qty-plus" onclick="updateCardQuantityAndPrice('${item.id}', 1)" aria-label="Increase quantity">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <button class="btn-add-cart" onclick="addToCartWithQty('${item.id}', '${item.name.replace(/'/g,"\\'")}', ${item.price}, 'qty-${item.id}')" aria-label="Add ${item.name} to cart">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Add to Order
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// New function to handle quantity changes and update price on the card
function updateCardQuantityAndPrice(itemId, change) {
  const qtySelector = document.getElementById(`qty-${itemId}`);
  if (!qtySelector) return;
  
  const input = qtySelector.querySelector('.qty-input');
  let quantity = parseInt(input.value) || 1;
  if (change !== 0) { quantity += change; }
  quantity = Math.max(1, Math.min(99, quantity));
  input.value = quantity;
  
  const card = qtySelector.closest('.menu-card');
  const priceEl = card.querySelector('.menu-card-price') || document.getElementById(`price-${itemId}`);
  
  // Check for variant price
  const variantSelect = document.getElementById(`var-${itemId}`);
  let currentPrice = parseFloat(priceEl.dataset.basePrice);
  
  if (variantSelect) {
    const selectedOption = variantSelect.options[variantSelect.selectedIndex];
    if (selectedOption) {
      currentPrice = parseFloat(selectedOption.dataset.price);
    }
  }
  
  const newTotal = currentPrice * quantity;
  priceEl.textContent = `₦${newTotal.toLocaleString()}`;
}

// Add item to cart with quantity from selector
function addToCartWithQty(itemId, itemName, itemPrice, qtyElementId) {
  const qtyInput = document.querySelector(`#${qtyElementId} .qty-input`);
  const qty = parseInt(qtyInput?.value) || 1;
  
  // Check for variant
  const variantSelect = document.getElementById(`var-${itemId}`);
  let finalPrice = itemPrice; // Stays as base price if no variant
  let variantName = null;
  let variantId = null;

  if (variantSelect) {
    const selectedOption = variantSelect.options[variantSelect.selectedIndex];
    finalPrice = parseFloat(selectedOption.dataset.price);
    variantName = selectedOption.text.split(' (+')[0];
    variantId = selectedOption.value;
  }

  addToCart(itemId, itemName, finalPrice, qty, variantId, variantName);

  // --- Visual Feedback ---
  const card = document.getElementById(qtyElementId)?.closest('.menu-card');
  if (card) {
    card.classList.add('added-to-cart-feedback');
    // Duration should match CSS animation
    setTimeout(() => {
      card.classList.remove('added-to-cart-feedback');
    }, 600);
  }

  // Optional: open cart after adding. You can comment this out if you prefer.
  openCart();
}

// Add item to cart
function addToCart(itemId, itemName, itemPrice, quantity = 1, variantId = null, variantName = null) {
  // Create a unique ID for cart items (combining item ID and variant ID)
  const cartId = variantId ? `${itemId}-${variantId}` : itemId;
  
  const existingItem = cart.find(item => item.cartId === cartId);
  // Reset quantity on card to 1 for next time
  updateCardQuantityAndPrice(itemId, -Infinity);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: itemId, // Database ID
      cartId: cartId, // Unique Cart ID
      variantId: variantId,
      name: itemName, // Base name
      variantName: variantName, // e.g., "Large"
      price: itemPrice,
      quantity: quantity
    });
  }

  saveCart();
  showNotification(`${quantity > 1 ? quantity + 'x ' : ''}${itemName}${variantName ? ` (${variantName})` : ''} added to cart!`, 'success');
}

// Remove item from cart
function removeFromCart(cartId) {
  cart = cart.filter(item => item.cartId !== cartId);
  saveCart();
  renderCart();
}

// Update item quantity
function updateQuantity(cartId, quantity) {
  const item = cart.find(item => item.cartId === cartId);
  if (item) {
    // Ensure quantity is a valid number, default to 1 if not.
    const newQuantity = isNaN(quantity) ? 1 : quantity;
    item.quantity = Math.max(1, Math.min(99, newQuantity));
    saveCart();
    renderCart();
  }
}

// Render cart
function renderCart() {
  const cartContainer = document.getElementById('cartContainer');
  if (!cartContainer) return;

  cartContainer.innerHTML = '';

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty</p>
        <p class="cart-empty-sub">Add items from the menu to get started.</p>
      </div>
    `;
    return;
  }

  // --- Cart Items ---
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'cart-items-list';

  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    const total = item.price * item.quantity;

    div.innerHTML = `
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}${item.variantName ? ` (${item.variantName})` : ''}</h4>
        <p class="cart-item-price">₦${Number(item.price).toLocaleString()}</p>
      </div>
      <div class="cart-item-actions">
        <input type="number" class="cart-item-qty" min="1" max="99" value="${item.quantity}" onchange="updateQuantity('${item.cartId}', this.valueAsNumber)">
        <span class="cart-item-total">₦${Number(total).toLocaleString()}</span>
        <button class="btn-remove" onclick="removeFromCart('${item.cartId}')" aria-label="Remove ${item.name}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 5v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    itemsDiv.appendChild(div);
  });
  cartContainer.appendChild(itemsDiv);

  // --- Cart Footer and Checkout ---
  const totalDiv = document.createElement('div');
  totalDiv.className = 'cart-footer';
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  totalDiv.innerHTML = `
    ${totalAmount > 0 ? `
      <form id="checkoutForm" class="checkout-form" onsubmit="submitOrder(event)">
        <div class="form-group">
          <label for="tableNumber">Table Number</label>
          <input type="text" id="tableNumber" name="tableNumber" class="form-input" placeholder="Enter your table #" required>
        </div>
        <div class="form-group">
          <label for="orderNotes">Notes (optional)</label>
          <textarea id="orderNotes" name="orderNotes" class="form-input" placeholder="Any special requests?"></textarea>
        </div>
        <button id="submitOrderBtn" type="submit" class="btn-cta btn-confirm" style="width: 100%;">
          <span class="btn-text">Execute Order</span>
          <span class="btn-loader"></span>
        </button>
      </form>
    ` : ''}
    <button class="btn-cta btn-cancel" onclick="closeCart()">Close</button>
  `;
  cartContainer.appendChild(totalDiv);
}

// Open cart
function openCart() {
  const cartPanel = document.getElementById('cartPanel');
  if (!cartPanel) return;

  const isHidden = cartPanel.style.display === 'none' || !cartPanel.style.display;
  if (isHidden) {
    cartPanel.style.display = 'flex';
    renderCart();
  }
}

// Toggle cart visibility
function toggleCart() {
  const cartPanel = document.getElementById('cartPanel');
  if (!cartPanel) return;

  const isHidden = cartPanel.style.display === 'none' || !cartPanel.style.display;

  if (isHidden) {
    openCart();
  } else {
    closeCart();
  }
}

// Close cart
function closeCart() {
  const cartPanel = document.getElementById('cartPanel');
  if (cartPanel) cartPanel.style.display = 'none';
}

async function submitOrder(event) {
  event.preventDefault();
  const tableNumber = document.getElementById('tableNumber').value.trim();
  const notes = document.getElementById('orderNotes').value.trim();
  const submitBtn = document.getElementById('submitOrderBtn');
  const form = document.getElementById('checkoutForm');

  if (!tableNumber) {
    showToast('Please enter a table number.', 'error');
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    // Capture cart state before clearing
    const submittedCart = [...cart];
    const finalTotal = submittedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 1. Create the order
    // include user id if authenticated (allows anonymous inserts too)
    const { data: { user } = {} } = await supabaseClient.auth.getUser();
    const orderPayload = {
      table_number: tableNumber,
      notes: notes,
      status: 'pending',
      ...(user ? { user_id: user.id } : {})
    };

    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Prepare order items
    const orderItems = submittedCart.map(item => ({
      order_id: orderData.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      variant_name: item.variantName
    }));

    // 3. Insert order items
    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 4. Success
    showOrderSuccessModal(orderData, submittedCart, finalTotal);
    cart = [];
    saveCart();
    closeCart();

  } catch (error) {
    console.error('Order submission failed:', error);
    showToast(`Order failed: ${error.message}`, 'error');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

function showOrderSuccessModal(order, orderedItems, total) {
  closeCart(); // Close the main cart panel

  const modalId = 'orderSuccessModal';
  if (document.getElementById(modalId)) return;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay active';
  modalOverlay.id = modalId;

  const itemsHtml = orderedItems.map(item => `
    <div class="summary-item">
      <span>${item.quantity}x ${item.name}${item.variantName ? ` (${item.variantName})` : ''}</span>
      <span>₦${(item.price * item.quantity).toLocaleString()}</span>
    </div>
  `).join('');

  modalOverlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header" style="text-align: center; display: block; border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
        <svg viewBox="0 0 24 24" style="width: 60px; height: 60px; margin: 0 auto 1rem; stroke: var(--success-green); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <h3 class="modal-title">Order Placed!</h3>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; text-align: center;">Your order for Table <strong>${order.table_number}</strong> has been sent to the kitchen.</p>
        <div class="order-summary">
          <h4 style="margin-bottom: 1rem; font-family: 'Rajdhani', sans-serif;">Order Summary</h4>
          ${itemsHtml}
          <div class="summary-total">
            <span>Total</span>
            <span class="total-price">₦${total.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-cta btn-confirm" onclick="closeOrderSuccessModal()" style="width: 100%;">Awesome!</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);
}

window.closeOrderSuccessModal = function() {
  const modal = document.getElementById('orderSuccessModal');
  if (modal) {
    modal.classList.remove('active');
    modal.addEventListener('transitionend', () => modal.remove(), { once: true });
  }
}

// Search functionality
function searchMenu() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const term = searchInput.value.toLowerCase();
  
  // Filter by search term and category
  let filtered = allMenuItems.filter(item =>
    item.name.toLowerCase().includes(term) ||
    (item.description && item.description.toLowerCase().includes(term))
  );
  
  // Apply category filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(item => item.category_id === currentFilter);
  }
  
  // Apply current sort
  filtered = applySort(filtered, currentSort);
  
  renderMenuItems(filtered);
}

// Debounce function to limit how often a function gets called
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Helper function to apply sorting
function applySort(items, sortBy) {
  let sorted = [...items];
  
  switch(sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price-asc':
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case 'price-desc':
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
      break;
  }
  
  return sorted;
}

// Show toast notification
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Animate out and remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Alias for showNotification
function showToast(message, type = 'info') {
  showNotification(message, type);
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showNotification('Notifications enabled for order updates', 'success');
      }
    } catch (err) {
      console.warn('Permission request failed', err);
    }
  }
}

// Mobile menu toggle
function toggleMobileMenu() {
  const navMenu = document.querySelector('.nav-menu');
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  if (navMenu && toggleBtn) {
    navMenu.classList.toggle('active');
    toggleBtn.classList.toggle('active');
  }
}

// PWA Install button
document.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', () => {
      e.prompt();
      e.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          installBtn.style.display = 'none';
          requestNotificationPermission();
        }
      });
    });
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenuPage);
} else {
  initMenuPage();
}

// Add event listeners if elements exist
window.addEventListener('load', () => {
  const searchInput = document.getElementById('searchInput');
  /* 
    For better search bar styling, consider this HTML structure in menu.html:
    <div class="search-container">
      <svg class="search-icon" ...>...</svg>
      <input type="search" id="searchInput" placeholder="Search menu...">
    </div>
    And style .search-container, .search-icon in your CSS.
    The 'search' type input often provides a native clear button.
  */
  if (searchInput) {
    // Use debounce to improve performance by not searching on every keystroke
    searchInput.addEventListener('input', debounce(searchMenu, 300));

    // Clear button support
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchMenu();
      }
    });
  }
  

  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  if (mobileToggle) {
      mobileToggle.addEventListener('click', toggleMobileMenu);
  }
  
  // Close mobile menu when a link is clicked
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const navMenu = document.querySelector('.nav-menu');
      const toggleBtn = document.querySelector('.mobile-menu-toggle');
      if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        toggleBtn.classList.remove('active');
      }
    });
  });

  // Keyboard navigation for cart
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeOrderSuccessModal();
    }
  });
});

// Keyboard support for quantity inputs
function handleQtyKeydown(e, elementId) {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    increaseQty(elementId);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    decreaseQty(elementId);
  }
}
