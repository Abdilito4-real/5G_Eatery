# 5G EATERY - QUICK START GUIDE

## What Changed?

✅ **Simplified Architecture:**
- One global menu (no restaurants)
- Admin-only menu management
- Public menu browsing with local cart
- Cloudinary image uploads
- PWA offline support

---

## Files Overview

| File | Purpose |
|------|---------|
| `schema.sql` | Database tables & RLS policies |
| `supabase.js` | Supabase client + Cloudinary upload helper |
| `admin.js` | Admin dashboard logic (Menu CRUD) |
| `admin.html` | Admin login & menu management UI |
| `menu.js` | Public menu logic (Browse + Cart) |
| `menu.html` | Public menu UI |
| `service-worker.js` | PWA offline caching |
| `styles.css` | Styling |
| `ARCHITECTURE.md` | Detailed documentation |

---

## Step 1: Setup Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Wait for database to initialize
4. Copy URL and public API key

### 1.2 Create Tables

1. In Supabase dashboard, open **SQL Editor**
2. Create new query
3. Copy entire contents of `schema.sql`
4. Paste and run
5. Tables created automatically with RLS policies

### 1.3 Update Credentials

In `supabase.js`, update:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_PUBLIC_KEY';
```

---

## Step 2: Setup Admin User

1. Go to Supabase > Auth > Users tab
2. Click "Add user manually"
3. Enter admin email and password
4. Copy the user ID
5. User can now login to admin panel

---

## Step 3: Setup Cloudinary

### 3.1 Create Account

1. Go to https://cloudinary.com
2. Sign up free account
3. Confirm email

### 3.2 Create Upload Preset

1. Go to Settings > Upload
2. Click "Add upload preset"
3. Name: `eatery_uploads`
4. **IMPORTANT:** Set "Signing Mode" to **Unsigned**
5. Save

### 3.3 Get Cloud Name

1. Dashboard > Account details
2. Copy **Cloud Name**

### 3.4 Update Credentials

In `supabase.js`, update:

```javascript
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = 'eatery_uploads';
```

---

## Step 4: Deploy

### Option A: Vercel (Recommended)

```bash
npm install -g vercel
cd "5G Eatery"
vercel
```

### Option B: Netlify

1. Push code to GitHub
2. Connect GitHub to Netlify
3. Deploy

### Option C: GitHub Pages

1. Push code to GitHub
2. Go to repo > Settings > Pages
3. Select "Deploy from branch" → main
4. Update package.json:

```json
{
  "homepage": "https://yourusername.github.io/5g-eatery"
}
```

### Option D: Local Testing

```bash
cd "5G Eatery"
python -m http.server 8000
```

Visit: http://localhost:8000/menu.html

---

## Step 5: Test

### Admin Panel

1. Visit `/admin.html`
2. Login with admin email/password
3. You should see Menu Management panel
4. Click "+ Add Item"
5. Fill form and upload image
6. Click "Save Item"
7. Item should appear in menu list

### Public Menu

1. Visit `/menu.html`
2. See uploaded menu items
3. Click add to cart
4. View cart, modify quantities
5. Checkout with table number

---

## Database Structure

### categories
```json
{
  "id": "uuid",
  "name": "Burgers",
  "created_at": "2024-03-01T12:00:00Z"
}
```

### menu_items
```json
{
  "id": "uuid",
  "name": "Cheeseburger",
  "description": "Grilled beef with cheese",
  "price": 500,
  "image_url": "https://res.cloudinary.com/.../burger.jpg",
  "available": true,
  "category_id": "uuid",
  "created_at": "2024-03-01T12:00:00Z",
  "updated_at": "2024-03-01T12:00:00Z"
}
```

### orders
```json
{
  "id": "uuid",
  "table_number": "5",
  "notes": "Extra sauce",
  "status": "pending",
  "created_at": "2024-03-01T12:00:00Z"
}
```

### order_items
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "menu_item_id": "uuid",
  "quantity": 2,
  "created_at": "2024-03-01T12:00:00Z"
}
```

---

## Common Tasks

### Add a Menu Category

1. Admin logs in
2. In Menu Management panel, click "+ Add Category"
3. Enter category name
4. Click "Save"

### Create a Menu Item

1. Admin logs in
2. Click "+ Add Item"
3. Fill fields:
   - **Name:** Item name
   - **Description:** Optional details
   - **Category:** Select from dropdown
   - **Price:** ₦ amount
   - **Image:** Click to upload to Cloudinary
4. Click "Save Item"

### Edit a Menu Item

1. Admin logs in
2. Find item in list
3. Click pencil icon
4. Update fields
5. Click "Save Item"

### Make Item Unavailable

1. Admin logs in
2. Toggle switch next to item
3. Off = hidden from public menu

### Delete Item

1. Admin logs in
2. Click trash icon
3. Confirm deletion

---

## Troubleshooting

### "Supabase client not initialized"

**Problem:** supabase.js not loaded

**Fix:** In HTML head, ensure:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
```

### Admin login fails

**Check:**
- Correct email/password?
- User exists in Supabase > Auth > Users?
- Project URL/Key correct in supabase.js?

### Images not uploading

**Check:**
- Cloudinary credentials correct?
- Upload preset exists and is Unsigned?
- File size < 10MB?
- Network tab shows successful upload?

### Menu items not loading

**Check:**
- Items marked as `available = true`?
- Supabase connection working?
- Check browser console for errors
- Run schema.sql again

### Cart not saving

**Check:**
- localStorage enabled?
- Clear browser cache and retry
- Check browser DevTools > Application > Storage

---

## Environment Variables (Optional)

For better security, you can use environment variables:

### .env.local
```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_KEY=your-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud
VITE_CLOUDINARY_PRESET=your-preset
```

Then update supabase.js:
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
```

---

## File Structure

```
5G Eatery/
├── admin.html              ← Admin login & menu management
├── admin.js                ← Admin logic
├── menu.html               ← Public menu page
├── menu.js                 ← Public menu logic
├── index.html              ← Home page
├── about.html              ← About page
├── locations.html          ← Locations page
├── supabase.js             ← Supabase client
├── service-worker.js       ← PWA offline support
├── styles.css              ← Styling
├── loader.css              ← Loading spinner styles
├── loader.js               ← Loading spinner logic
├── schema.sql              ← Database setup
├── manifest.json           ← PWA manifest
├── offline.html            ← Offline page
├── ARCHITECTURE.md         ← Full documentation
└── QUICKSTART.md           ← This file
```

---

## What's Different from Old Version?

### ❌ Removed
- Restaurants table (multi-tenant support)
- Profiles table (no user roles)
- Orders dashboard (simplified)
- Order history/revenue charts
- Recipe/cuisine tags

### ✅ Added/Improved
- Single global menu
- Simplified admin panel (menu only)
- Cart in localStorage (no need to login)
- Better error messages
- Cloudinary image upload helper
- Improved RLS policies
- Service worker improvements

---

## Next Steps

1. **Setup Database** → Run schema.sql
2. **Configure Credentials** → Update supabase.js
3. **Create Admin User** → In Supabase Auth
4. **Setup Cloudinary** → Create upload preset
5. **Test Admin Panel** → Add first menu item
6. **Test Public Menu** → Browse and add to cart
7. **Deploy** → Vercel, Netlify, or GitHub Pages

---

## Support

- **Supabase Issues:** https://supabase.com/docs
- **Cloudinary Issues:** https://cloudinary.com/documentation
- **PWA Issues:** https://web.dev/progressive-web-apps/

---

## Security Checklist

- [ ] Supabase URL is NOT public endpoint?
- [ ] Public API key only used on client (NOT secret key)?
- [ ] Cloudinary upload preset is Unsigned?
- [ ] Admin passwords are strong?
- [ ] RLS policies enabled on all tables?
- [ ] HTTPS enabled on deployment?

---

Good luck! 🚀
