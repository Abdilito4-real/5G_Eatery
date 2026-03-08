// ═══════════════════════════════════════════════════════════════════════════════
// 5G EATERY - ADMIN DASHBOARD (Optimized & Consolidated)
// ═══════════════════════════════════════════════════════════════════════════════

// ==============================================================================
// CONFIGURATION & CONSTANTS
// ==============================================================================
const CONFIG = {
  TOAST_DURATION: 4000,
  ERROR_DURATION: 7000,
  REFRESH_INTERVAL: 30000,
  MAX_HISTORY_ITEMS: 100
};

const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  print: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`
};

// ==============================================================================
// STATE MANAGEMENT
// ==============================================================================
let state = {
  menuCategories: [],
  liveOrders: [],
  historyOrders: [],
  historyFilter: 'all',
  currentTab: 'orders',
  currentOrderTab: 'live',
  analyticsRange: 'week',
  charts: {}
};

// ==============================================================================
// THEME MANAGEMENT
// ==============================================================================
// ==============================================================================
// TOAST NOTIFICATIONS
// ==============================================================================
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const duration = type === 'error' ? CONFIG.ERROR_DURATION : CONFIG.TOAST_DURATION;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-inner">
        <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
        <span class="toast-msg">${message}</span>
        <button class="toast-close" onclick="this.closest('.toast').remove()">&times;</button>
      </div>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Animate progress bar
    requestAnimationFrame(() => {
      toast.querySelector('.toast-progress').style.animation = `toastProgress ${duration}ms linear forwards`;
    });

    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
};
// ==============================================================================
// AUTHENTICATION
// ==============================================================================
const Auth = {
  async init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    this.handleSession(session);
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
      this.handleSession(session);
    });
  },

  handleSession(session) {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const body = document.body;

    if (session) {
      loginSection.style.display = 'none';
      dashboardSection.style.display = 'block';
      body.classList.add('admin-body');
      this.requestNotificationPermission();
      Dashboard.init();
    } else {
      loginSection.style.display = 'flex';
      dashboardSection.style.display = 'none';
      body.classList.remove('admin-body');
    }
  },

  async login(email, password) {
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async logout() {
    await supabaseClient.auth.signOut();
  },

  async requestNotificationPermission() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') return; // already have it, silent

    if (Notification.permission === 'denied') {
      // Already blocked — don't spam, just log
      console.warn('Notifications blocked. Admin can enable via browser settings.');
      return;
    }

    // 'default' — ask the user
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      Toast.show('🔔 Push notifications enabled for new orders', 'success');
    } else {
      Toast.show('Notifications blocked — enable in browser settings to get new-order alerts', 'warning');
    }
  }
};

// ==============================================================================
// DASHBOARD MANAGEMENT
// ==============================================================================
const Dashboard = {
  init() {
    MenuManager.fetch();
    OrderManager.fetchLive();
    OrderManager.subscribe();
    this.showTab('orders');
  },

  showTab(tab) {
    state.currentTab = tab;
    
    // Update panels
    document.querySelectorAll('.admin-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tab}Panel`).classList.add('active');

    // Update desktop nav
    document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.getElementById(`nav-${tab}`)?.classList.add('active');

    // Update mobile nav
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach((btn, index) => {
      btn.classList.remove('active');
      if ((tab === 'orders' && index === 0) ||
          (tab === 'menu' && index === 1) ||
          (tab === 'analytics' && index === 2)) {
        btn.classList.add('active');
      }
    });

    // Load tab data
    if (tab === 'analytics') AnalyticsManager.fetch();
    
    // Scroll to top on mobile
    if (window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  showOrderTab(tab) {
    state.currentOrderTab = tab;
    
    document.getElementById('ordersList').style.display = tab === 'live' ? 'grid' : 'none';
    document.getElementById('historyContainer').style.display = tab === 'history' ? 'block' : 'none';
    
    document.getElementById('tab-live')?.classList.toggle('active', tab === 'live');
    document.getElementById('tab-history')?.classList.toggle('active', tab === 'history');

    document.getElementById('refreshLiveBtn').style.display = tab === 'live' ? 'flex' : 'none';

    if (tab === 'history') OrderManager.fetchHistory();
  }
};

// ==============================================================================
// MENU MANAGEMENT
// ==============================================================================
const MenuManager = {
  async fetch() {
    try {
      // Fetch categories
      const { data: categories, error: catError } = await supabaseClient
        .from('categories')
        .select('*')
        .order('name');
      
      if (catError) throw catError;
      state.menuCategories = categories || [];

      // Fetch menu items
      const { data: items, error: itemError } = await supabaseClient
        .from('menu_items')
        .select('*')
        .order('name');
      
      if (itemError) throw itemError;
      
      this.render(items);
    } catch (error) {
      console.error('Menu fetch error:', error);
      Toast.show('Failed to load menu', 'error');
    }
  },

  render(items) {
    const container = document.getElementById('menuList');
    container.innerHTML = '';

    if (!items?.length) {
      container.innerHTML = '<div class="empty-state">No menu items yet</div>';
      return;
    }

    items.forEach(item => {
      const category = state.menuCategories.find(c => c.id === item.category_id);
      const card = document.createElement('div');
      card.className = `menu-card ${!item.available ? 'unavailable' : ''}`;
      
      card.innerHTML = `
        <img src="${item.image_url || 'logo.png'}" alt="${item.name}" class="menu-card-image" onerror="this.src='logo.png'">
        <div class="menu-card-details">
          <div class="menu-card-header">
            <h4>${item.name}</h4>
            ${category ? `<span class="menu-category">${category.name}</span>` : ''}
          </div>
          <p class="menu-card-description">${item.description ? item.description.substring(0, 60) + '...' : 'No description'}</p>
          <div class="menu-card-footer">
            <span class="menu-price">₦${Number(item.price).toLocaleString()}</span>
            <div class="menu-actions">
              <label class="toggle-switch">
                <input type="checkbox" ${item.available ? 'checked' : ''} onchange="MenuManager.toggleAvailability('${item.id}', this.checked)">
              </label>
              <button onclick="MenuManager.openEdit('${item.id}')" class="btn-icon" title="Edit">${ICONS.edit}</button>
              <button onclick="MenuManager.delete('${item.id}')" class="btn-icon delete" title="Delete">${ICONS.delete}</button>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(card);
    });

    this.filter();
  },

  filter() {
    const search = document.getElementById('adminMenuSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#menuList .menu-card').forEach(card => {
      const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.menu-card-description')?.textContent.toLowerCase() || '';
      card.style.display = (title.includes(search) || desc.includes(search)) ? '' : 'none';
    });
  },

  async toggleAvailability(id, status) {
    try {
      const { error } = await supabaseClient
        .from('menu_items')
        .update({ available: status })
        .eq('id', id);
      
      if (error) throw error;
      Toast.show(`Item ${status ? 'activated' : 'deactivated'}`, status ? 'success' : 'warning');
    } catch (error) {
      Toast.show(`Status update failed: ${error.message}`, 'error');
      this.fetch();
    }
  },

  async delete(id) {
    Modal.confirm('DELETE ITEM?', 'This action cannot be undone.', async () => {
      try {
        const { error } = await supabaseClient.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        Toast.show('Item deleted', 'success');
        this.fetch();
      } catch (error) {
        Toast.show(`Delete failed: ${error.message}`, 'error');
      }
    });
  },

  openAdd() {
    Modal.openItem(null);
  },

  async openEdit(id) {
    try {
      const { data: item, error } = await supabaseClient
        .from('menu_items')
        .select('*, menu_item_variants(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      Modal.openItem(item);
    } catch (error) {
      Toast.show('Failed to load item', 'error');
    }
  }
};

// ==============================================================================
// ORDER MANAGEMENT
// ==============================================================================
const OrderManager = {
  async fetchLive(highlightId = null, isManualRefresh = false) {
    const refreshBtn = document.getElementById('refreshLiveBtn');
    let svg;
    if (isManualRefresh && refreshBtn) {
        refreshBtn.disabled = true;
        svg = refreshBtn.querySelector('svg');
        if (svg) {
          // The spin animation is defined in styles.css
          svg.style.animation = 'spin 1s linear infinite';
        }
    }

    try {
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            variant_name,
            menu_items (name, image_url, price)
          )
        `)
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      state.liveOrders = orders;
      this.renderLive(orders, highlightId);
      if (isManualRefresh) {
        Toast.show('Live orders refreshed', 'info');
      }
    } catch (error) {
      console.error('Live orders error:', error);
      document.getElementById('ordersList').innerHTML = '<div class="error-state">Could not fetch orders</div>';
    } finally {
      if (isManualRefresh && refreshBtn) {
        refreshBtn.disabled = false;
        if (svg) {
          svg.style.animation = '';
        }
      }
    }
  },

  renderLive(orders, highlightId = null) {
    const container = document.getElementById('ordersList');
    container.innerHTML = '';

    if (!orders?.length) {
      container.innerHTML = '<div class="empty-state">No active orders</div>';
      return;
    }

    orders.forEach(order => {
      const isNew = order.id === highlightId;
      const card = document.createElement('div');
      card.className = `order-card ${order.status === 'pending' ? 'new' : ''} ${isNew ? 'highlight-new' : ''}`;
      
      const timeAgo = this.timeSince(new Date(order.created_at));

      card.innerHTML = `
        <div class="order-header">
          <span class="order-table">Table ${order.table_number}</span>
          <span class="order-time" data-created-at="${order.created_at}">${timeAgo}</span>
        </div>
        <div class="order-items">
          ${order.order_items.map(item => `
            <div class="order-item">
              <img src="${item.menu_items?.image_url || 'logo.png'}" alt="${item.menu_items?.name || 'Item'}" class="order-item-image">
              <div class="order-item-details">
                <span class="order-item-name">${item.menu_items?.name || 'Deleted Item'}</span>
                ${item.variant_name ? `<span class="order-item-variant">${item.variant_name}</span>` : ''}
              </div>
              <span class="order-item-qty">${item.quantity}x</span>
            </div>
          `).join('')}
          ${order.notes ? `<div class="order-notes">📝 ${order.notes}</div>` : ''}
        </div>
        <div class="order-footer">
          ${order.status === 'preparing' ? `
            <button class="btn-icon" onclick="event.stopPropagation(); OrderManager.print('${order.id}')" title="Print">${ICONS.print}</button>
          ` : ''}
          ${order.status === 'pending' ? `
            <button class="btn-cta" onclick="event.stopPropagation(); OrderManager.updateStatus('${order.id}', 'preparing')">Accept</button>
          ` : ''}
          ${order.status === 'preparing' ? `
            <button class="btn-cta" onclick="OrderManager.updateStatus('${order.id}', 'completed')">Complete</button>
          ` : ''}
          <button class="btn-cta btn-cancel" onclick="OrderManager.updateStatus('${order.id}', 'cancelled')">Cancel</button>
        </div>
      `;
      
      container.appendChild(card);
    });
  },

  async fetchHistory() {
    const container = document.getElementById('ordersListHistory');
    container.innerHTML = '<div class="loading-state"><div class="loader-small"></div></div>';

    try {
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select('*, order_items (quantity, variant_name, menu_items (name, price))')
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(CONFIG.MAX_HISTORY_ITEMS);

      if (error) throw error;

      state.historyOrders = orders;
      this.renderHistory();
      AnalyticsManager.updateRevenueWidget(orders);
    } catch (error) {
      console.error('History fetch error:', error);
      container.innerHTML = '<div class="error-state">Could not fetch history</div>';
    }
  },

  renderHistory() {
    const container = document.getElementById('ordersListHistory');
    const filtered = state.historyFilter === 'all' 
      ? state.historyOrders 
      : state.historyOrders.filter(o => o.status === state.historyFilter);

    if (!filtered?.length) {
      container.innerHTML = `<div class="empty-state">No ${state.historyFilter} orders found</div>`;
      return;
    }

    container.innerHTML = filtered.map(order => `
      <div class="order-card status-${order.status}">
        <div class="order-header">
          <span class="order-table">Table ${order.table_number}</span>
          <span class="order-time">${new Date(order.created_at).toLocaleString()}</span>
        </div>
        <div class="order-items">
          ${order.order_items.map(item => `
            <div class="order-item">
              <span class="order-item-name">${item.quantity}x ${item.menu_items?.name || 'Deleted Item'}</span>
              ${item.variant_name ? `<span class="order-item-variant">(${item.variant_name})</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="order-footer">
          <span class="order-status ${order.status}">${order.status}</span>
          <button class="btn-icon" onclick="OrderManager.print('${order.id}')" title="Print">${ICONS.print}</button>
        </div>
      </div>
    `).join('');
  },

  setFilter(filter) {
    state.historyFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`hist-filter-${filter}`)?.classList.add('active');
    this.renderHistory();
  },

  confirmDeleteHistory() {
    Modal.confirm('DELETE ALL HISTORY?', 'This will permanently delete all completed and cancelled orders. This action cannot be undone.', () => {
      this.deleteAllHistory();
    });
  },

  async deleteAllHistory() {
    Toast.show('Clearing order history...', 'info');
    try {
      const { error } = await supabaseClient
        .from('orders')
        .delete()
        .in('status', ['completed', 'cancelled']);
      
      if (error) throw error;
      Toast.show('Order history cleared', 'success');
      this.fetchHistory();
    } catch (error) {
      Toast.show(`Failed to clear history: ${error.message}`, 'error');
    }
  },

  async updateStatus(orderId, status) {
    try {
      const { error } = await supabaseClient
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      Toast.show(`Order marked as ${status}`, 'success');
      this.fetchLive();
      if (status === 'completed' || status === 'cancelled') {
        this.fetchHistory();
      }
    } catch (error) {
      Toast.show('Failed to update order', 'error');
    }
  },

  subscribe() {
    const channel = supabaseClient.channel('orders');
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const order = payload.new;
        Toast.show(`New order from Table ${order.table_number}!`, 'info');
        this.sendNotification(order);
        this.fetchLive(order.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        this.fetchLive();
      })
      .subscribe();
  },

  async sendNotification(order) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: `🍽️ New Order from Table ${order.table_number}! Tap to review.`,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: `order-${order?.id || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      data: { orderId: order?.id, tableNumber: order?.table_number },
      actions: [
        { action: 'accept', title: '✅ Accept' },
        { action: 'view',   title: '👁 View'   }
      ]
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('5G Eatery', options);
      } else {
        // Fallback for browsers without SW
        new Notification('5G Eatery', options);
      }
    } catch (err) {
      console.warn('Notification failed:', err);
      // Silent fallback — toast already shown
    }
  },

  print(orderId) {
    const order = state.liveOrders.find(o => o.id === orderId) || 
                  state.historyOrders.find(o => o.id === orderId);
    
    if (!order) {
      Toast.show('Order not found', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; }
            h2 { text-align: center; color: #E10600; }
            .header { text-align: center; margin-bottom: 20px; }
            .items { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; margin-top: 10px; text-align: right; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>5G EATERY</h2>
          <div class="header">
            <div>Table: ${order.table_number}</div>
            <div>${new Date(order.created_at).toLocaleString()}</div>
          </div>
          <div class="items">
            ${order.order_items.map(item => {
              const price = item.menu_items?.price || 0;
              return `
                <div class="item">
                  <span>${item.quantity}x ${item.menu_items?.name || 'Item'}${item.variant_name ? ` (${item.variant_name})` : ''}</span>
                  <span>₦${(price * item.quantity).toFixed(2)}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="total">
            Total: ₦${order.order_items.reduce((sum, item) => 
              sum + (item.quantity * (item.menu_items?.price || 0)), 0).toFixed(2)}
          </div>
          ${order.notes ? `<div><strong>Notes:</strong> ${order.notes}</div>` : ''}
          <div class="footer">Thank you for your order!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  },

  updateTimers() {
    document.querySelectorAll('.order-time[data-created-at]').forEach(el => {
        const createdAt = el.dataset.createdAt;
        if (createdAt) {
            el.textContent = this.timeSince(new Date(createdAt));
        }
    });
  },

  timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
};

// ==============================================================================
// ANALYTICS MANAGEMENT
// ==============================================================================
const AnalyticsManager = {
  async fetch() {
    const container = document.getElementById('analyticsContent');
    container.innerHTML = '<div class="loading-state"><div class="loader-small"></div><p>Crunching data...</p></div>';

    try {
      const range = document.getElementById('analyticsTimeRange')?.value || 'week';
      const dateRange = this.getDateRange(range);
      
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
          created_at,
          table_number,
          order_items (
            quantity,
            variant_name,
            menu_items (
              name,
              price,
              menu_item_variants (name, price)
            )
          )
        `)
        .eq('status', 'completed')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      if (error) throw error;

      const analytics = this.processData(orders);
      this.render(analytics, range);

    } catch (error) {
      console.error('Analytics error:', error);
      container.innerHTML = '<div class="error-state">Could not load analytics</div>';
    }
  },

  getDateRange(range) {
    const end = new Date();
    const start = new Date();
    
    switch(range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020, 0, 1);
        break;
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  },

  processData(orders) {
    let totalRevenue = 0;
    let totalItems = 0;
    const popularItems = {};
    const hourlyData = Array(24).fill(0);
    const dailyData = {};

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const hour = orderDate.getHours();
      const day = orderDate.toISOString().split('T')[0];
      
      let orderRevenue = 0;

      order.order_items.forEach(item => {
        if (!item.menu_items) return;
        
        let price = item.menu_items.price;
        
        if (item.variant_name && item.menu_items.menu_item_variants) {
          const variant = item.menu_items.menu_item_variants.find(v => v.name === item.variant_name);
          if (variant) price = variant.price;
        }

        const revenue = item.quantity * price;
        orderRevenue += revenue;
        totalItems += item.quantity;

        const itemName = item.variant_name 
          ? `${item.menu_items.name} (${item.variant_name})`
          : item.menu_items.name;
        
        popularItems[itemName] = (popularItems[itemName] || 0) + item.quantity;
      });

      totalRevenue += orderRevenue;
      hourlyData[hour] += orderRevenue;
      dailyData[day] = (dailyData[day] || 0) + orderRevenue;
    });

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalItems,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      popularItems: Object.entries(popularItems).sort((a, b) => b[1] - a[1]).slice(0, 10),
      hourlyData,
      dailyData: Object.entries(dailyData).sort().slice(-14)
    };
  },

  render(data, range) {
    const container = document.getElementById('analyticsContent');
    const rangeLabels = {
      today: 'Today', week: 'Last 7 Days', month: 'Last 30 Days', year: 'Last 12 Months', all: 'All Time'
    };

    container.innerHTML = `
      <div class="analytics-grid">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total Revenue</span>
            <span class="stat-value">₦${data.totalRevenue.toLocaleString()}</span>
            <span class="stat-period">${rangeLabels[range]}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Completed Orders</span>
            <span class="stat-value">${data.totalOrders}</span>
            <span class="stat-period">${rangeLabels[range]}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Items Sold</span>
            <span class="stat-value">${data.totalItems}</span>
            <span class="stat-period">${rangeLabels[range]}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Avg. Order Value</span>
            <span class="stat-value">₦${data.avgOrderValue.toFixed(2)}</span>
            <span class="stat-period">Per order</span>
          </div>
        </div>

        <div class="chart-card">
          <h4>Revenue Trend</h4>
          <canvas id="revenueChart"></canvas>
        </div>

        <div class="chart-card">
          <h4>Peak Hours</h4>
          <div class="hourly-heatmap">
            ${this.renderHeatmap(data.hourlyData)}
          </div>
        </div>

        <div class="chart-card">
          <h4>Top Selling Items</h4>
          <canvas id="popularItemsChart"></canvas>
        </div>

        <div class="insights-grid">
          <div class="insight-card">
            <span class="insight-label">Busiest Day</span>
            <span class="insight-value">${data.dailyData[data.dailyData.length-1]?.[0] || 'N/A'}</span>
          </div>
          <div class="insight-card">
            <span class="insight-label">Peak Hour</span>
            <span class="insight-value">${this.getPeakHour(data.hourlyData)}</span>
          </div>
          <div class="insight-card">
            <span class="insight-label">Items/Order</span>
            <span class="insight-value">${(data.totalItems / data.totalOrders || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>
    `;

    this.initCharts(data);
  },

  renderHeatmap(hourlyData) {
    const max = Math.max(...hourlyData);
    let html = '<div class="heatmap-grid">';
    
    for (let i = 0; i < 24; i++) {
      const value = hourlyData[i];
      const intensity = max > 0 ? value / max : 0;
      const opacity = 0.3 + (intensity * 0.7);
      
      html += `
        <div class="heatmap-cell" style="background: rgba(225, 6, 0, ${opacity});" 
             title="${i}:00 - ${i+1}:00: ₦${value.toLocaleString()}">
          <span class="heatmap-hour">${i}:00</span>
          <span class="heatmap-value">₦${(value/1000).toFixed(1)}k</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  },

  getPeakHour(hourlyData) {
    const max = Math.max(...hourlyData);
    const hour = hourlyData.indexOf(max);
    return `${hour}:00 - ${hour+1}:00`;
  },

  initCharts(data) {
    // Destroy existing charts
    Object.values(state.charts).forEach(chart => chart?.destroy());
    
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-primary');

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revenueCtx) {
      state.charts.revenue = new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: data.dailyData.map(d => new Date(d[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'Revenue (₦)',
            data: data.dailyData.map(d => d[1]),
            borderColor: '#E10600',
            backgroundColor: 'rgba(225, 6, 0, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#E10600',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `₦${ctx.raw.toLocaleString()}` } }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor, callback: v => '₦' + v.toLocaleString() },
              grid: { color: gridColor }
            },
            x: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });
    }

    // Popular Items Chart
    const itemsCtx = document.getElementById('popularItemsChart')?.getContext('2d');
    if (itemsCtx) {
      state.charts.popular = new Chart(itemsCtx, {
        type: 'bar',
        data: {
          labels: data.popularItems.map(i => i[0].length > 20 ? i[0].substring(0, 20) + '...' : i[0]),
          datasets: [{
            label: 'Quantity Sold',
            data: data.popularItems.map(i => i[1]),
            backgroundColor: '#E10600',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${ctx.raw} units sold` } }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            y: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });
    }
  },

  updateRevenueWidget(orders) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayRevenue = 0;
    let todayOrders = 0;

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      
      if (orderDate.getTime() === today.getTime()) {
        todayOrders++;
        order.order_items.forEach(item => {
          if (item.menu_items?.price) {
            todayRevenue += item.quantity * item.menu_items.price;
          }
        });
      }
    });

    document.getElementById('todayRevenue').textContent = `₦${todayRevenue.toFixed(2)}`;
    document.getElementById('todayOrders').textContent = todayOrders;
  },

  export() {
    const data = [
      ['Metric', 'Value'],
      ['Total Revenue', document.querySelector('.stat-card:first-child .stat-value')?.textContent || '₦0'],
      ['Completed Orders', document.querySelector('.stat-card:nth-child(2) .stat-value')?.textContent || '0'],
      ['Items Sold', document.querySelector('.stat-card:nth-child(3) .stat-value')?.textContent || '0'],
      ['Avg Order Value', document.querySelector('.stat-card:last-child .stat-value')?.textContent || '₦0']
    ];

    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    Toast.show('Analytics exported successfully', 'success');
  }
};

// ==============================================================================
// MODAL MANAGEMENT
// ==============================================================================
const Modal = {
  init() {
    this.menuItemModal = document.getElementById('adminMenuModal');
    this.categoryModal = document.getElementById('categoryModal');
    this.confirmModal = document.getElementById('confirmationModal');
    this.confirmCallback = null;
  },

  openItem(item) {
    const form = document.getElementById('menuItemForm');
    form.reset();
    
    document.getElementById('menuItemId').value = item?.id || '';
    document.getElementById('modalTitle').textContent = item ? 'EDIT PROTOCOL' : 'ADD PROTOCOL';
    
    if (item) {
      document.getElementById('itemName').value = item.name || '';
      document.getElementById('itemPrice').value = item.price || '';
      document.getElementById('itemDescription').value = item.description || '';
      
      const category = state.menuCategories.find(c => c.id === item.category_id);
      document.getElementById('categoryInput').value = category?.name || '';
      
      if (item.image_url) {
        const preview = document.getElementById('imagePreview');
        preview.src = item.image_url;
        preview.classList.add('active');
        const placeholder = document.querySelector('.upload-placeholder');
        if (placeholder) placeholder.style.display = 'none';
      }
    }

    this.populateCategories();
    this.initVariants(item?.menu_item_variants || []);
    this.menuItemModal.classList.add('active');
  },

  populateCategories() {
    const datalist = document.getElementById('categoryList');
    datalist.innerHTML = '';
    state.menuCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      datalist.appendChild(option);
    });
  },

  initVariants(variants) {
    const container = document.getElementById('variantList');
    if (!container) return;
    
    container.innerHTML = '';
    variants.forEach(v => this.addVariantRow(v));
    this.updateBasePriceVisibility();
  },

  addVariantRow(variant = {}) {
    const container = document.getElementById('variantList');
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = `
      <input type="hidden" class="variant-id" value="${variant.id || ''}">
      <input type="text" class="variant-name" placeholder="Size (e.g. Large)" value="${variant.name || ''}" required>
      <input type="number" class="variant-price" placeholder="Price" value="${variant.price || ''}" required>
      <button type="button" class="btn-icon delete" onclick="this.closest('.variant-row').remove(); Modal.updateBasePriceVisibility()">${ICONS.delete}</button>
    `;
    container.appendChild(row);
    this.updateBasePriceVisibility();
  },

  updateBasePriceVisibility() {
    const container = document.getElementById('variantList');
    const priceInput = document.getElementById('itemPrice');
    const priceGroup = priceInput?.closest('.form-group');
    
    if (container && priceGroup) {
      const hasVariants = container.children.length > 0;
      priceGroup.style.display = hasVariants ? 'none' : '';
      if (hasVariants) priceInput.removeAttribute('required');
      else priceInput.setAttribute('required', '');
    }
  },

  openCategory() {
    document.getElementById('categoryForm').reset();
    this.categoryModal.classList.add('active');
  },

  closeCategory() {
    this.categoryModal.classList.remove('active');
  },

  confirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    this.confirmCallback = callback;
    this.confirmModal.classList.add('active');
  },

  closeConfirm() {
    this.confirmModal.classList.remove('active');
    this.confirmCallback = null;
  },

  closeAll() {
    this.menuItemModal?.classList.remove('active');
    this.categoryModal?.classList.remove('active');
    this.confirmModal?.classList.remove('active');
  }
};

// ==============================================================================
// CATEGORY MANAGEMENT
// ==============================================================================
const CategoryManager = {
  async add(name) {
    if (!name) return;
    
    const exists = state.menuCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      Toast.show('Category already exists', 'warning');
      return false;
    }

    try {
      const { error } = await supabaseClient
        .from('categories')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;

      await MenuManager.fetch();
      Modal.populateCategories();
      document.getElementById('categoryInput').value = name;
      Toast.show(`Category "${name}" created`, 'success');
      Modal.closeCategory();
      return true;
    } catch (error) {
      Toast.show(`Failed to create category: ${error.message}`, 'error');
      return false;
    }
  },

  async delete(name) {
    const category = state.menuCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!category) {
      Toast.show('Category not found', 'error');
      return false;
    }

    Modal.confirm('DELETE CATEGORY?', `Delete "${category.name}"? Items will be unassigned.`, async () => {
      try {
        const { error } = await supabaseClient.from('categories').delete().eq('id', category.id);
        if (error) throw error;
        
        document.getElementById('categoryInput').value = '';
        await MenuManager.fetch();
        Modal.populateCategories();
        Toast.show(`Category "${category.name}" deleted`, 'success');
      } catch (error) {
        Toast.show(`Delete failed: ${error.message}`, 'error');
      }
    });
  }
};

// ==============================================================================
// FILE UPLOAD HANDLER
// ==============================================================================
const FileUpload = {
  init() {
    const container = document.querySelector('.image-upload-area');
    const input = document.getElementById('itemImage');
    
    if (!container || !input) return;

    container.addEventListener('click', () => input.click());
    
    input.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
    });
    
    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });
    
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      this.handleFile(e.dataTransfer.files[0]);
    });
  },

  handleFile(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      Toast.show('Please select an image file', 'warning');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      Toast.show('Image must be under 10MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('imagePreview');
      preview.src = e.target.result;
      preview.classList.add('active');
      document.querySelector('.upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
};

// ==============================================================================
// FORM HANDLER
// ==============================================================================
document.getElementById('menuItemForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const itemName = document.getElementById('itemName').value.trim();
  let itemPrice = parseFloat(document.getElementById('itemPrice').value);
  const variants = Modal.getVariantsFromUI?.() || [];

  if (variants.length > 0) {
    itemPrice = Math.min(...variants.map(v => v.price));
  }

  if (!itemName) {
    Toast.show('Item name is required', 'warning');
    return;
  }

  if (isNaN(itemPrice) || itemPrice <= 0) {
    Toast.show('Valid price is required', 'warning');
    return;
  }

  const submitBtn = e.target.querySelector('.btn-confirm');
  submitBtn.classList.add('loading');

  try {
    const catName = document.getElementById('categoryInput').value.trim();
    const category = state.menuCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    
    if (!category) {
      throw new Error(`Category "${catName}" not found`);
    }

    const imageFile = document.getElementById('itemImage').files[0];
    let imageUrl = null;

    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }

    const itemId = document.getElementById('menuItemId').value;
    const itemData = {
      name: itemName,
      price: itemPrice,
      description: document.getElementById('itemDescription').value.trim(),
      category_id: category.id,
      ...(!itemId && { available: true }),
      ...(imageUrl && { image_url: imageUrl })
    };

    let savedItemId = itemId;

    if (itemId) {
      const { error } = await supabaseClient
        .from('menu_items')
        .update(itemData)
        .eq('id', itemId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseClient
        .from('menu_items')
        .insert(itemData)
        .select()
        .single();
      if (error) throw error;
      savedItemId = data.id;
    }

    // Handle variants
    if (savedItemId) {
      await supabaseClient.from('menu_item_variants').delete().eq('menu_item_id', savedItemId);
      
      if (variants.length > 0) {
        const { error } = await supabaseClient
          .from('menu_item_variants')
          .insert(variants.map(v => ({ menu_item_id: savedItemId, name: v.name, price: v.price })));
        if (error) throw error;
      }
    }

    Toast.show(`"${itemName}" saved successfully`, 'success');
    Modal.closeAll();
    MenuManager.fetch();

  } catch (error) {
    console.error('Save error:', error);
    Toast.show(error.message, 'error');
  } finally {
    submitBtn.classList.remove('loading');
  }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginButton');
  const feedback = document.getElementById('loginFeedback');

  btn.classList.add('loading');
  feedback.textContent = '';

  const result = await Auth.login(email, password);
  
  btn.classList.remove('loading');
  
  if (!result.success) {
    feedback.textContent = `ACCESS DENIED: ${result.error}`;
    document.querySelector('.login-box')?.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(0)' }
    ], { duration: 400 });
  }
});

document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newCategoryName').value.trim();
  await CategoryManager.add(name);
});

document.getElementById('confirmBtn')?.addEventListener('click', () => {
  if (Modal.confirmCallback) {
    Modal.confirmCallback();
    Modal.closeConfirm();
  }
});

// ==============================================================================
// INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  Modal.init();
  FileUpload.init();
  Auth.init();

  const search = document.getElementById('adminMenuSearch');
  if (search) {
    search.addEventListener('input', () => MenuManager.filter());
  }

  setInterval(() => {
    if (state.currentTab === 'orders' && state.currentOrderTab === 'live') {
      OrderManager.fetchLive();
    }
  }, CONFIG.REFRESH_INTERVAL);

  // Update timers every second for a "live" feel
  setInterval(() => {
    if (state.currentTab === 'orders' && state.currentOrderTab === 'live') {
      OrderManager.updateTimers();
    }
  }, 1000);
});

// ==============================================================================
// EXPOSE GLOBALS
// Must be defined at parse time (not inside DOMContentLoaded) so that onclick
// attributes in dynamically-rendered HTML can always resolve these names.
// ==============================================================================
window.showTab          = (tab)    => Dashboard.showTab(tab);
window.showOrderTab     = (tab)    => Dashboard.showOrderTab(tab);
window.filterHistory    = (filter) => OrderManager.setFilter(filter);
window.logout           = ()       => Auth.logout();
window.refreshAnalytics = ()       => AnalyticsManager.fetch();
window.exportAnalytics  = ()       => AnalyticsManager.export();

window.MenuManager      = MenuManager;
window.OrderManager     = OrderManager;
window.Modal            = Modal; // Exposing Modal for confirmDeleteHistory
window.CategoryManager  = CategoryManager;

window.addNewCategory    = ()    => Modal.openCategory();
window.closeCategoryModal= ()    => Modal.closeCategory();
window.closeAdminModal   = ()    => Modal.closeAll();
window.closeConfirmModal = ()    => Modal.closeConfirm();
window.deleteCategory    = ()    => {
  const name = document.getElementById('categoryInput')?.value.trim();
  if (name) CategoryManager.delete(name);
};

Modal.getVariantsFromUI = function () {
  const rows = document.querySelectorAll('.variant-row');
  return Array.from(rows).map(row => ({
    id:    row.querySelector('.variant-id')?.value    || null,
    name:  row.querySelector('.variant-name')?.value.trim(),
    price: parseFloat(row.querySelector('.variant-price')?.value)
  })).filter(v => v.name && !isNaN(v.price));
};

// Listen for actions from Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type, orderId, status, action } = event.data || {};
    if (type === 'UPDATE_ORDER_STATUS') {
      OrderManager.updateStatus(orderId, status);
    } else if (type === 'NOTIFICATION_ACTION') {
      if (action === 'accept') {
        OrderManager.updateStatus(orderId, 'preparing');
        Toast.show('Order accepted from notification', 'success');
      } else if (action === 'view') {
        window.focus();
        Dashboard.showTab('orders');
      }
    } else if (type === 'NOTIFICATION_CLICK') {
      window.focus();
      Dashboard.showTab('orders');
    }
  });
}
