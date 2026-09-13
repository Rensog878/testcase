import express from 'express';
import { db, USER_ROLES } from './db.js';
import { HttpError, sendError, userInputError } from './http.js';
import { orderWhatsAppEnabled, sendOrderConfirmation } from './orderNotifications.js';
import { getWhatsAppSenderStatus } from './whatsapp.js';

// Every route in this file is mounted behind requireAuth('admin') in server.js,
// so req.user is always the signed-in admin.
const router = express.Router();

const USER_FIELDS = ['name', 'phone', 'email', 'password', 'role', 'crop', 'acreage', 'village', 'district', 'state', 'department', 'status'];
const USER_STATUSES = ['active', 'inactive'];

// Only known user fields are accepted, so a request cannot set ids, createdBy,
// timestamps or anything else by adding it to the body.
function pickUserFields(body) {
    const picked = {};
    for (const field of USER_FIELDS) {
        if (body?.[field] !== undefined) picked[field] = body[field];
    }

    if (picked.phone !== undefined) {
        picked.phone = String(picked.phone).trim();
        if (picked.phone && !/^[6-9]\d{9}$/.test(picked.phone)) {
            throw new HttpError(400, 'Please enter a valid 10-digit mobile number.');
        }
    }
    if (picked.email !== undefined) {
        picked.email = String(picked.email).trim().toLowerCase();
        if (picked.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(picked.email)) {
            throw new HttpError(400, 'Please enter a valid email address.');
        }
    }
    if (picked.role !== undefined && !USER_ROLES.includes(picked.role)) {
        throw new HttpError(400, 'Unknown user role.');
    }
    if (picked.status !== undefined && !USER_STATUSES.includes(picked.status)) {
        throw new HttpError(400, 'Unknown account status.');
    }
    return picked;
}

function matchesSearch(user, search) {
    const needle = String(search).toLowerCase();
    return ['name', 'phone', 'email', 'crop', 'village', 'district', 'state'].some((key) =>
          String(user[key] || '').toLowerCase().includes(needle)
                                                                                     );
}

router.get('/users', async (req, res) => {
    try {
          const { role, sortBy, search } = req.query;
          let users = await db.getUsers();

      if (role && role !== 'all') {
              users = users.filter((u) => u.role === role);
      }
          if (search) {
                  users = users.filter((u) => matchesSearch(u, search));
          }

      users = users.slice();
          if (sortBy === 'name') {
                  users.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          } else {
                  users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          }

      res.json({ success: true, data: users });
    } catch (err) {
          sendError(res, err, 'List users');
    }
});

router.post('/users', async (req, res) => {
    try {
          if (!req.body?.phone && !req.body?.email) {
                throw new HttpError(400, 'Please provide a mobile number or email address.');
          }
          const user = await db.createUser({ ...pickUserFields(req.body), createdBy: 'admin' });
          res.json({ success: true, user });
    } catch (err) {
          sendError(res, userInputError(err), 'Create user');
    }
});

router.put('/users/:id', async (req, res) => {
    try {
          const updates = pickUserFields(req.body);

          // Stop an admin locking themselves out of the admin panel.
          if (req.params.id === req.user.id && ((updates.role && updates.role !== 'admin') || (updates.status && updates.status !== 'active'))) {
                throw new HttpError(400, 'You cannot remove your own admin access.');
          }

          const user = await db.updateUser(req.params.id, updates);
          if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
          }
          res.json({ success: true, user });
    } catch (err) {
          sendError(res, userInputError(err), 'Update user');
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
          if (req.params.id === req.user.id) {
                throw new HttpError(400, 'You cannot delete your own account.');
          }
          const ok = await db.deleteUser(req.params.id);
          if (!ok) {
                return res.status(404).json({ success: false, message: 'User not found' });
          }
          res.json({ success: true });
    } catch (err) {
          sendError(res, err, 'Delete user');
    }
});

router.get('/profile-fields', async (req, res) => {
    try {
          const fields = await db.getProfileFields();
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Profile fields');
    }
});

router.put('/profile-fields', async (req, res) => {
    try {
          const fields = await db.saveProfileFields(req.body.fields || req.body);
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Save profile fields');
    }
});

// Sends, or sends again, the WhatsApp order confirmation to the customer.
router.post('/orders/:id/whatsapp', async (req, res) => {
    try {
          if (!orderWhatsAppEnabled()) {
                throw new HttpError(503, 'WhatsApp order messages are not configured on the server.');
          }
          const order = await db.getOrderById(req.params.id);
          if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
          }

          const status = await sendOrderConfirmation(order, { resend: true });
          if (status === 'skipped') {
                throw new HttpError(409, 'A message for this order is being sent right now. Please wait a moment.');
          }

          const notification = (await db.getOrderById(order.id))?.notifications?.orderConfirmation || null;
          if (status !== 'sent') {
                return res.status(502).json({ success: false, status, notification, message: `Could not send: ${notification?.error || 'unknown error'}` });
          }
          res.json({ success: true, status, notification, message: `Order details sent on WhatsApp to +91 ${order.customerPhone}.` });
    } catch (err) {
          sendError(res, err, 'Resend order WhatsApp');
    }
});

// Health of each WhatsApp sending number: session state, resting, sends today.
router.get('/whatsapp/senders', async (req, res) => {
    try {
          res.json({ success: true, data: await getWhatsAppSenderStatus() });
    } catch (err) {
          sendError(res, err, 'WhatsApp sender status');
    }
});

// Live numbers for the admin dashboard cards.
router.get('/stats', async (req, res) => {
    try {
          const data = await db.getAdminStats();
          res.json({ success: true, data });
    } catch (err) {
          sendError(res, err, 'Admin stats');
    }
});

router.get('/wishlist-summary', async (req, res) => {
    try {
          const items = await db.getWishlists();
          const products = await db.getProducts();
          const data = products.map(product => ({
                productId: product.id,
                productName: product.name,
                wishlistCount: items.filter(item => item.productId === product.id).length
          })).filter(item => item.wishlistCount > 0).sort((a, b) => b.wishlistCount - a.wishlistCount);
          res.json({ success: true, total: items.length, data });
    } catch (err) {
          sendError(res, err, 'Wishlist summary');
    }
});

export default router;
