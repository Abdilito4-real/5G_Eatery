# 5G EATERY - NEW ARCHITECTURE DOCUMENTATION

## Overview

The 5G Eatery project has been restructured into a **simplified, single-menu architecture** with **guaranteed authentication** for admin users. This eliminates the complex multi-restaurant model and focuses on:

- ✅ **Single Global Menu List** - One menu shared by all users
- ✅ **Admin-Only CRUD** - Only authenticated admins can create/update/delete menu items
- ✅ **Public Menu Display** - Unauthenticated users can browse and add items to cart
- ✅ **Cloudinary Integration** - Images uploaded to Cloudinary (not stored in DB)
- ✅ **Local Cart Storage** - Cart saved in browser localStorage
- ✅ **PWA Ready** - Service worker enables offline functionality

---

## Database Schema

### Tables

#### 1. `categories`
```sql
id                UUID (Primary Key)
name              TEXT (UNIQUE)
created_at        TIMESTAMPTZ
```
- Global categories for organizing menu items
- Admin-only create/update/delete
- Public read access

#### 2. `menu_items`
```sql
id                UUID (Primary Key)
name              TEXT
description       TEXT
price             NUMERIC
image_url         TEXT (Cloudinary URL)
available         BOOLEAN (default: true)
category_id       UUID (Foreign Key → categories)
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```
- Single global menu - no `restaurant_id`
- Images stored in Cloudinary, URLs saved here
- Admin-only create/update/delete
- Public read (only available=true items)

---

## Authentication & Authorization

### Row Level Security (RLS)

**Categories & Menu Items:**
- `SELECT`: Available to everyone (public read)
- `INSERT/UPDATE/DELETE`: Only authenticated users (admin verification happens at app level)

```sql
-- Menu Items Example
CREATE POLICY "Menu items viewable by everyone" 
  ON menu_items FOR SELECT USING (true);

CREATE POLICY "Admins can insert menu items" 
  ON menu_items FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
```

### Admin Verification

Admin authentication is handled in the frontend:
- User logs in with email/password via Supabase Auth
- JWT token stored in browser session
- Admin panel requires valid session to access
- All API calls include auth token automatically

---

## File Structure

```
5G Eatery/
├── supabase.js           # Supabase client initialization
├── menu.js               # Public menu page logic
├── admin.js              # Admin panel logic
├── menu.html             # Public menu UI
├── admin.html            # Admin dashboard UI
├── service-worker.js     # PWA offline support
├── styles.css            # Styling
├── schema.sql            # Database schema
├── index.html            # Home page
├── about.html            # About page
├── locations.html        # Locations page
├── manifest.json         # PWA manifest
└── offline.html          # Offline fallback page
```

---

## Workflow

### 1. Admin: Create Menu Item

**Flow:**
1. Admin logs into `/admin.html` with email/password
2. Clicks "Add Item" in Menu Management panel
3. Fills form: Name, Description, Price, Category
4. Selects image file
5. Image uploaded to Cloudinary → URL returned
6. Item saved to `menu_items` table with Cloudinary URL
7. Menu refreshes, new item appears in list

**Code Path:**
- `admin.js` → `openAddModal()` → `menuItemForm.submit()` → `uploadToCloudinary()` → Insert into DB

**Database:**
```javascript
const itemData = {
  name: "Burger",
  price: 500,
  description: "Grilled beef burger",
  category_id: "uuid-here",
  image_url: "https://res.cloudinary.com/.../burger.jpg",
  available: true
};

await supabaseClient.from('menu_items').insert(itemData);
```

### 2. Admin: Edit Menu Item

**Flow:**
1. Click edit icon on menu item card
2. Modal opens with current item data
3. Update fields and/or image
4. Submit to update database
5. If new image: upload to Cloudinary first, then save URL

**Code Path:**
- `admin.js` → `openEditModal(itemId)` → Fetch item → Display form → `menuItemForm.submit()` → Update in DB

### 3. Admin: Delete Menu Item

**Flow:**
1. Click delete icon
2. Confirmation dialog appears
3. Click confirm
4. Item deleted from database

**Code Path:**
- `admin.js` → `deleteItem(itemId)` → `showConfirm()` → DELETE from DB

### 4. Admin: Toggle Item Availability

**Flow:**
1. Toggle switch on/off for an item
2. Updates `available` field in database
3. Public users won't see unavailable items

**Code Path:**
- `admin.js` → `toggleAvailability(itemId, status)` → Update DB

### 5. Admin: Manage Categories

**Flow:**
1. Click "+ Add Category" button in modal
2. Enter category name
3. Save to categories table
4. Use when creating/editing menu items

**Code Path:**
- `admin.js` → `addNewCategory()` → `categoryForm.submit()` → Insert into categories

### 6. Public User: Browse Menu

**Flow:**
1. Visit `/menu.html`
2. `menu.js` → `initMenuPage()` → Fetch categories + menu items
3. Menu items rendered with filter buttons
4. User can:
   - Search by name/description
   - Filter by category
   - View item details (name, description, price, image)

**Code Path:**
- `menu.js` → `fetchMenuData()` → Fetch from DB → `renderMenuItems()` → Display to user

### 7. Public User: Add to Cart

**Flow:**
1. Click "Add to Cart" button on item
2. Item added to browser localStorage
3. Cart badge updated with item count
4. User can continue shopping or view cart

**Code Path:**
- `menu.js` → `addToCart(itemId, itemName, itemPrice)` → Save to localStorage

### 8. Public User: Checkout

**Flow:**
1. Click cart to view items
2. Adjust quantities or remove items
3. Click "Checkout"
4. Enter table number + notes
5. Submit order
6. Order created in `orders` table
7. Order items created in `order_items` table
8. Cart cleared

**Code Path:**
- `menu.html` → Submit checkout form → Create order → Create order_items → Clear cart

---

## Cloudinary Integration

### Configuration

**File:** `supabase.js`

```javascript
const CLOUDINARY_CLOUD_NAME = 'dhqpxqnw6';
const CLOUDINARY_UPLOAD_PRESET = 'eatery_uploads';

window.uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  return data.secure_url;
};
```

### How It Works

1. User selects image in admin panel
2. `uploadToCloudinary()` sends to Cloudinary
3. Cloudinary returns secure URL
4. URL saved to `menu_items.image_url`
5. Menu displays image from Cloudinary

### Benefits

- ✅ Images not stored in database (faster queries)
- ✅ Cloudinary handles image optimization
- ✅ URL-based access (easy to update without DB changes)
- ✅ Bandwidth savings with CDN

---

## Cart Management

### Storage

**Browser localStorage key:** `5g-eatery-cart`

**Format:**
```javascript
[
  { id: "item-uuid", name: "Burger", price: 500, quantity: 2 },
  { id: "item-uuid-2", name: "Fries", price: 200, quantity: 1 }
]
```

### Operations

| Operation | Function | Location |
|-----------|----------|----------|
| Load cart | `loadCart()` | menu.js |
| Save cart | `saveCart()` | menu.js |
| Add item | `addToCart(id, name, price)` | menu.js |
| Remove item | `removeFromCart(itemId)` | menu.js |
| Update quantity | `updateQuantity(itemId, qty)` | menu.js |
| Render cart UI | `renderCart()` | menu.js |

---

## Service Worker & PWA

### Caching Strategy

| Resource Type | Strategy |
|---------------|----------|
| HTML pages | Network first, fallback to cache |
| Supabase API | Network first, fallback to cache |
| Cloudinary images | Cache first, fallback to network |
| Static assets (CSS, JS) | Cache first, fallback to network |

### Offline Support

When offline, users can:
- ✅ Browse cached menu (previously loaded)
- ✅ Add items to cart
- ✅ View offline page if page not cached

Cannot (requires internet):
- ❌ Fetch fresh menu data
- ❌ Submit orders
- ❌ Admin login

---

## API Endpoints Used

### Supabase

All endpoints use Supabase REST API via `supabaseClient`:

| Operation | Table | Method | Query |
|-----------|-------|--------|-------|
| Get all categories | categories | GET | `.select('*')` |
| Get menu items | menu_items | GET | `.select('*').eq('available', true)` |
| Create menu item | menu_items | INSERT | `.insert(itemData)` |
| Update menu item | menu_items | UPDATE | `.update(itemData).eq('id', id)` |
| Delete menu item | menu_items | DELETE | `.delete().eq('id', id)` |
| Create order | orders | INSERT | `.insert(orderData)` |
| Create order items | order_items | INSERT | `.insert(itemsArray)` |

### Cloudinary

**Endpoint:** `https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload`

**Method:** POST

**Params:**
- `file` (multipart form data)
- `upload_preset` (unsigned for client-side)
- `cloud_name`

**Response:** JSON with `secure_url` field

---

## Setup Instructions

### 1. Database Setup

1. Go to Supabase dashboard
2. Create new database project
3. Run `schema.sql` in SQL Editor
4. Tables auto-created with RLS policies

### 2. Environment Configuration

Update in `supabase.js`:
```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_KEY = 'your-public-key';
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';
const CLOUDINARY_UPLOAD_PRESET = 'your-preset';
```

### 3. Create Admin User

1. Go to Supabase Auth > Users
2. Create new user with email/password
3. User can now login to admin panel

### 4. Initialize Menu (Manual)

Admin can create categories and items via admin panel, or manually via Supabase:

```sql
INSERT INTO public.categories (name) VALUES
  ('Burgers'),
  ('Sides'),
  ('Drinks');
```

### 5. Deploy

Deploy to Vercel, Netlify, or any static host. No backend server required!

---

## Security Considerations

### ✅ What's Protected

- Admin login: Email/password via Supabase Auth
- Admin CRUD: RLS policies enforce authenticated access
- Image uploads: Cloudinary preset uses unsigned tokens (safe for client)

### ⚠️ Current Limitations

- No session timeout (JWT persists)
- No admin role table (all authenticated users can CRUD)
- No audit logging
- No approval workflow

### 🔒 Future Enhancements

```sql
-- Optional: Admins table for granular control
CREATE TABLE admin_users (
  id UUID REFERENCES auth.users(id),
  email TEXT UNIQUE,
  role TEXT DEFAULT 'menu_manager',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy using admin_users table
ALTER POLICY "Admins can insert menu items" 
  ON menu_items
  USING (id IN (SELECT id FROM admin_users));
```

---

## Testing Checklist

### Admin Panel
- [ ] Login with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Add category
- [ ] Delete category
- [ ] Create menu item with image
- [ ] Edit menu item
- [ ] Delete menu item
- [ ] Toggle availability
- [ ] Search menu items
- [ ] Logout

### Public Menu
- [ ] Menu loads on page refresh
- [ ] Categories display as filter buttons
- [ ] Search filters items correctly
- [ ] Category filter works
- [ ] Add item to cart
- [ ] Cart updates badge count
- [ ] View cart, modify quantities
- [ ] Remove item from cart
- [ ] Checkout creates order
- [ ] Images load from Cloudinary
- [ ] Works offline (with cached data)

---

## Troubleshooting

### Menu items not showing

**Check:**
1. Are items marked as `available = true`?
2. Is Supabase connection working?
3. Check browser console for errors
4. Verify RLS policies allow SELECT

### Images not uploading

**Check:**
1. Cloudinary credentials correct?
2. Upload preset exists and is unsigned?
3. File size < 10MB?
4. Check network tab in DevTools
5. Verify CORS settings in Cloudinary

### Cart not saving

**Check:**
1. localStorage enabled in browser?
2. No quota exceeded?
3. Check browser console for storage errors
4. Clear site data and retry

### Admin login not working

**Check:**
1. User exists in Supabase Auth?
2. Correct email/password?
3. User has valid session?
4. JWT token in localStorage?
5. Check browser DevTools > Application > Storage

---

## Future Roadmap

- [ ] Order management dashboard for admins
- [ ] Real-time order notifications (Supabase Realtime)
- [ ] Order history and analytics
- [ ] Multi-admin support with roles
- [ ] Menu item variants (sizes, extras)
- [ ] Payment integration
- [ ] Email/SMS order confirmations
- [ ] Customer accounts (optional login)
- [ ] Ratings and reviews
- [ ] Inventory tracking

---

## Questions?

Refer to:
- **Supabase Docs:** https://supabase.com/docs
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Service Worker:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
