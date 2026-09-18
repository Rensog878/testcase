/**
 * Sathyam Bio - High Performance Structured Database Engine
 * Persistent, MongoDB-backed relational store (via Mongoose) with the same
 * business logic, filtering, sorting and computed-field behavior as the
 * original JSON-file engine, but safe for Vercel's read-only filesystem.
 */

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { hashPassword, isPasswordHash, passwordProblems, weakPasswordMessage } from './security.js';
import { matchesCrop, matchesCategory, matchesDisease } from '../src/utils/catalogUtils.js';
import { DEFAULT_PROFILE_FIELDS, normalizeProfileFields, splitProfileValues, validateProfileValues } from '../src/shared/profileFieldRules.js';

// ================= CONNECTION (serverless-safe, cached across invocations) =================

let cached = global._mongooseConn;
if (!cached) {
    cached = global._mongooseConn = { conn: null, promise: null };
}

let seedPromise = null;

export async function connectDB() {
    if (cached.conn) return cached.conn;

  if (!cached.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
                throw new Error(
                          'MONGODB_URI environment variable is not set. Configure it (e.g. a MongoDB Atlas connection string) before the API can serve requests.'
                        );
        }
        mongoose.set('strictQuery', false);
        cached.promise = mongoose.connect(uri, { bufferCommands: false }).then(m => m);
  }

  try {
        cached.conn = await cached.promise;
  } catch (err) {
        cached.promise = null;
        throw err;
  }

  if (!seedPromise) {
        seedPromise = seedIfEmpty().catch(err => {
                console.error('Database seed error:', err);
                seedPromise = null;
        });
  }
    await seedPromise;

  return cached.conn;
}

// ================= SCHEMAS / MODELS =================
// _id is kept as the existing human-readable string id (USR-1001, sb-01,
// SB-ORD-8821, etc.) instead of switching to Mongo ObjectIds, and every
// schema is permissive (strict:false) so no field present in the original
// loosely-typed JSON records is ever silently dropped.

const permissive = { strict: false, minimize: false, versionKey: '__v' };

// phone is unique: sparse so accounts without a number are still allowed.
// The index only builds once existing duplicates are removed (dedupe-phones.js).
const userSchema = new mongoose.Schema(
    { _id: String, phone: { type: String, unique: true, sparse: true } },
    permissive
);
const productSchema = new mongoose.Schema({ _id: String }, permissive);
const orderSchema = new mongoose.Schema({ _id: String }, permissive);
const advisorySubscriberSchema = new mongoose.Schema({ _id: String }, permissive);
const advisoryBroadcastSchema = new mongoose.Schema({ _id: String }, permissive);
const inventoryItemSchema = new mongoose.Schema({ _id: String }, permissive);
const staffTaskSchema = new mongoose.Schema({ _id: String }, permissive);
const ticketSchema = new mongoose.Schema({ _id: String }, permissive);
const farmerEnquirySchema = new mongoose.Schema({ _id: String }, permissive);
const chatRecordSchema = new mongoose.Schema({ _id: String }, permissive);
// One cart per user: _id is the user's id.
const cartSchema = new mongoose.Schema({ _id: String }, permissive);
const wishlistItemSchema = new mongoose.Schema({ _id: String }, permissive);
const settingsSchema = new mongoose.Schema(
  {
        _id: String,
        cms: mongoose.Schema.Types.Mixed,
        catalogOptions: mongoose.Schema.Types.Mixed,
        profileFields: mongoose.Schema.Types.Mixed
  },
  { strict: false, minimize: false }
  );

// Razorpay order ids are single-use: a replayed or double-submitted payment can
// never produce a second order. Older orders without one are left out of the index.
orderSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } }
);

// Short-lived server state (OTP codes, rate-limit counters, checkout sessions).
// Kept in MongoDB rather than process memory so it survives across serverless
// instances; MongoDB deletes each record once purgeAt has passed.
const ephemeralSchema = new mongoose.Schema(
  { _id: String, value: mongoose.Schema.Types.Mixed, purgeAt: Date },
  { strict: false, minimize: false, versionKey: false }
);
ephemeralSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const AdvisorySubscriber =
    mongoose.models.AdvisorySubscriber || mongoose.model('AdvisorySubscriber', advisorySubscriberSchema);
const AdvisoryBroadcast =
    mongoose.models.AdvisoryBroadcast || mongoose.model('AdvisoryBroadcast', advisoryBroadcastSchema);
const InventoryItem = mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
const StaffTask = mongoose.models.StaffTask || mongoose.model('StaffTask', staffTaskSchema);
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
const FarmerEnquiry = mongoose.models.FarmerEnquiry || mongoose.model('FarmerEnquiry', farmerEnquirySchema);
const ChatRecord = mongoose.models.ChatRecord || mongoose.model('ChatRecord', chatRecordSchema);
const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
const WishlistItem = mongoose.models.WishlistItem || mongoose.model('WishlistItem', wishlistItemSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
const Ephemeral = mongoose.models.Ephemeral || mongoose.model('Ephemeral', ephemeralSchema);
const blogSchema = new mongoose.Schema({ _id: String }, permissive);
const videoSchema = new mongoose.Schema({ _id: String }, permissive);
const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);
const invoiceSchema = new mongoose.Schema({ _id: String }, permissive);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// Images uploaded from the admin CMS. They live in MongoDB rather than on disk
// because the app is deployed to a serverless host, where the filesystem is
// wiped between invocations. Base64 costs ~33% over the raw bytes, which is
// fine for a handful of certification logos and poster images; a product
// catalogue's worth of photos would belong in object storage instead.
const uploadSchema = new mongoose.Schema({ _id: String }, permissive);
const Upload = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);

export const USER_ROLES = ['farmer', 'admin', 'employee', 'delivery', 'billing'];

// Human-readable ids with enough randomness that records created in the same
// millisecond (or by concurrent serverless instances) cannot collide.
export function newId(prefix) {
    const time = Date.now().toString(36).toUpperCase();
    const random = crypto.randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
    return `${prefix}-${time}${random}`;
}

function inputError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
}

// ================= SERIALIZATION HELPERS =================

// Strips Mongo's _id/__v and re-exposes the record's own `id` field
// (mirrored from _id), matching the shape the original JSON records had.
function serialize(doc) {
    if (!doc) return doc;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const { _id, __v, ...rest } = obj;
    return { id: _id, ...rest };
}

// Users never leave the database layer with their password unless the caller
// explicitly needs it to check a login.
function serializeUser(doc, { includePassword = false } = {}) {
    const user = serialize(doc);
    if (!user || includePassword) return user;
    const { password, ...safe } = user;
    return safe;
}

// Strips Mongo's _id/__v without adding an `id` field - used for records
// (like chat sessions) whose natural key isn't called `id`.
function stripMongoFields(doc) {
    if (!doc) return doc;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const { _id, __v, ...rest } = obj;
    return rest;
}

// Replicates the defaulting + review-rating aggregation logic that the
// original db.js applied once at load() time - applied here on every read.
function normalizeProduct(product) {
    const reviews = Array.isArray(product.reviews) ? product.reviews : [];
    return {
          ...product,
          images:
            Array.isArray(product.images) && product.images.length
              ? product.images
                    : product.image
              ? [product.image]
                    : [],
          howToUse: product.howToUse || '',
          whenToUse: product.whenToUse || '',
          relatedBlogs: Array.isArray(product.relatedBlogs) ? product.relatedBlogs : [],
          relatedProductIds: Array.isArray(product.relatedProductIds) ? product.relatedProductIds : [],
          reviewsEnabled: product.reviewsEnabled === true,
          reviews,
          rating: reviews.length
            ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
                  : null,
          reviewsCount: reviews.length
    };
}

// ================= DEFAULT / SEED DATA =================

const DEFAULT_CATALOG_OPTIONS = {
    categories: ['Fungicide', 'Insecticide', 'Herbicide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Adjuvant', 'Seeds', 'Equipments', 'Animal Husbandry'],
    crops: [
          'Paddy / Rice',
          'Wheat',
          'Cotton',
          'Tomato',
          'Corn / Maize',
          'Sugarcane',
          'Citrus / Fruits',
          'Grapes / Fruits',
          'Potato'
        ],
    storageBatches: ['250g', '500g', '1kg', '250ml', '500ml', '1 Litre', '5 Litres'],
    diseases: ['Blast', 'Blight', 'Rust', 'Aphids', 'Whitefly', 'Downy Mildew', 'Leaf Miner', 'Pinworm', 'Leaf hopper', 'Thrips', 'Mites', 'Stem Borer', 'Weeds']
};


const INITIAL_CMS = {
    heroTitle: 'SATHYAM BIO-PESTICIDES & CROP CARE',
    heroSubtitle: 'Government & 100% Bio-Certified Solutions for High Yield & Zero Chemical Residue Farming',
    bannerAnnouncement:
          '🎉 KHARIF SPECIAL: Flat 20% OFF on Bio-Fungicides + Free Agronomist Hotline 1800-425-8899',
    advisoryTitle: 'Get Weekly Crop & Pesticide Recommendations',
    advisorySubtitle:
          'Join 15,000+ farmers receiving our free seasonal advisory newsletter. Kharif & Rabi crop schedules, disease alerts, and exclusive offers every week.',
    contactPhone: '+91 94432 10987',
    contactEmail: 'care@sathyambio.in',
    razorpayKeyId: 'rzp_test_sathyaBioLiveKey102',
    razorpaySecret: 'rzp_secret_mock_live_9988',
    razorpayMode: 'test'
};

const INITIAL_USERS = [
  {
        id: 'USR-1001',
        name: 'Rameshwar Patel',
        phone: '9876543210',
        email: 'rameshwar@farm.in',
        password: 'password123',
        role: 'farmer',
        crop: 'Paddy / Rice',
        acreage: 5,
        village: 'Karur',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        status: 'active',
        createdBy: 'admin',
        createdAt: '2026-08-01T08:00:00.000Z',
        lastLogin: '2026-09-05T14:30:00.000Z'
  },
  {
        id: 'USR-1002',
        name: 'Sathyam Admin',
        phone: '9123456789',
        email: 'admin@sathyambio.com',
        password: 'admin',
        role: 'admin',
        crop: 'All Crops',
        acreage: 0,
        village: 'Headquarters',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        status: 'active',
        createdBy: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastLogin: '2026-09-06T10:00:00.000Z'
  },
  {
        id: 'USR-1003',
        name: 'Muthuvel K. (QC)',
        phone: '9234567890',
        email: 'muthuvel@sathyambio.com',
        password: 'password123',
        role: 'employee',
        crop: 'Cotton',
        acreage: 12,
        village: 'Tiruppur',
        district: 'Tiruppur',
        state: 'Tamil Nadu',
        department: 'Quality Control',
        status: 'active',
        createdBy: 'admin',
        createdAt: '2026-06-15T09:00:00.000Z',
        lastLogin: '2026-09-04T16:20:00.000Z'
  },
  {
        id: 'USR-1004',
        name: 'Karthik Raja',
        phone: '9345678901',
        email: 'karthik@sathyambio.com',
        password: 'password123',
        role: 'delivery',
        crop: 'N/A',
        acreage: 0,
        village: 'Erode Central',
        district: 'Erode',
        state: 'Tamil Nadu',
        status: 'active',
        createdBy: 'admin',
        createdAt: '2026-07-10T11:00:00.000Z',
        lastLogin: '2026-09-06T08:15:00.000Z'
  },
  {
        id: 'USR-1005',
        name: 'Billing Operator #04',
        phone: '9456789012',
        email: 'billing@sathyambio.com',
        password: 'password123',
        role: 'billing',
        crop: 'N/A',
        acreage: 0,
        village: 'Coimbatore Hub',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        status: 'active',
        createdBy: 'admin',
        createdAt: '2026-07-20T12:00:00.000Z',
        lastLogin: '2026-09-05T18:00:00.000Z'
  },
  {
        id: 'USR-1006',
        name: 'Suresh Reddy',
        phone: '9884255667',
        email: 'suresh@farm.in',
        password: 'password123',
        role: 'farmer',
        crop: 'Sugarcane',
        acreage: 8,
        village: 'Nandyal',
        district: 'Kurnool',
        state: 'Andhra Pradesh',
        status: 'active',
        createdBy: 'self-registered',
        createdAt: '2026-08-15T10:00:00.000Z',
        lastLogin: '2026-09-02T11:00:00.000Z'
  },
  {
        id: 'USR-1007',
        name: 'Gurpreet Singh',
        phone: '9814077889',
        email: 'gurpreet@punjabfarm.in',
        password: 'password123',
        role: 'farmer',
        crop: 'Wheat',
        acreage: 15,
        village: 'Karnal Suburbs',
        district: 'Karnal',
        state: 'Haryana',
        status: 'active',
        createdBy: 'admin',
        createdAt: '2026-08-20T14:00:00.000Z',
        lastLogin: '2026-09-01T09:45:00.000Z'
  }
  ];

const INITIAL_PRODUCTS = [
  {
        id: 'sb-01',
        name: 'Sathyam Bio BlastShield 75 WP',
        tagline: 'Systemic Bio-Fungicide for Paddy Blast & Neck Rot',
        category: 'Fungicide',
        price: 680,
        originalPrice: 850,
        discount: '20% OFF',
        stock: 420,
        crops: ['Paddy/Rice', 'Wheat', 'Corn'],
        diseases: ['Blast', 'Rust', 'Downy Mildew'],
        activeIngredient: 'Tricyclazole 75% WP + Bio-Enzyme Fortifier',
        dosage: '120g - 150g per Acre',
        packSizes: ['250g', '500g', '1kg'],
        selectedPack: '500g',
        badge: 'Best Seller',
        rating: 4.9,
        reviewsCount: 142,
        image: './assets/p1.png',
        description:
                'Advanced systemic bio-fortified fungicide providing protective and curative control against Blast disease in Paddy, Leaf Rust in Wheat, and Neck Blast.',
        detailedDescription:
                'Sathyam Bio BlastShield 75 WP rapidly penetrates plant tissue, establishing a protective barrier that stops fungal spore germination.',
        targetUserId: 'USR-1001',
        targetUserName: 'Rameshwar Patel (Paddy / Rice)',
        sortOrder: 1,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z'
  },
  {
        id: 'sb-02',
        name: 'Sathyam Bio FlyKill Ultra',
        tagline: 'Multi-Action Insecticide for Whitefly & Aphids',
        category: 'Insecticide',
        price: 840,
        originalPrice: 1050,
        discount: '20% OFF',
        stock: 185,
        crops: ['Cotton', 'Tomato', 'Citrus', 'Potato'],
        diseases: ['Whitefly', 'Aphids', 'Caterpillars'],
        activeIngredient: 'Diafenthiuron 50% WP + Botanical Neem Extract',
        dosage: '250g per Acre',
        packSizes: ['250g', '500g'],
        selectedPack: '250g',
        badge: 'Top Rated',
        rating: 4.8,
        reviewsCount: 98,
        image: './assets/p2.png',
        description:
                'Penetrates leaf cuticle rapidly to paralyze sucking pests like Whiteflies, Aphids, and Thrips. Prevents leaf curl virus spread.',
        detailedDescription:
                'FlyKill Ultra combines the fast knock-down power of modern chemistry with sustained botanical repellency.',
        targetUserId: 'USR-1003',
        targetUserName: 'Muthuvel K. (Cotton)',
        sortOrder: 2,
        createdAt: '2026-08-02T10:00:00.000Z',
        updatedAt: '2026-08-02T10:00:00.000Z'
  },
  {
        id: 'sb-03',
        name: 'Sathyam Bio BlightStop Pro',
        tagline: 'Dual Action Systemic Fungicide for Blight Control',
        category: 'Fungicide',
        price: 750,
        originalPrice: 900,
        discount: '17% OFF',
        stock: 65,
        crops: ['Tomato', 'Potato', 'Grapes', 'Citrus'],
        diseases: ['Blight', 'Downy Mildew'],
        activeIngredient: 'Mancozeb 64% + Metalaxyl 8% WP',
        dosage: '500g per Acre',
        packSizes: ['500g', '1kg', '5kg'],
        selectedPack: '1kg',
        badge: 'Expert Choice',
        rating: 4.9,
        reviewsCount: 215,
        image: './assets/p1.png',
        description:
                'Gold standard dual-action fungicide specifically formulated for Late Blight in Potato/Tomato and Downy Mildew in Grapevines.',
        detailedDescription:
                'Forms a protective film on plant surface while systemically inhibiting protein synthesis in pathogens.',
        targetUserId: 'all',
        targetUserName: 'All Users (General Catalog)',
        sortOrder: 3,
        createdAt: '2026-08-03T10:00:00.000Z',
        updatedAt: '2026-08-03T10:00:00.000Z'
  },
  {
        id: 'sb-04',
        name: 'Sathyam Bio RootVigor Gold',
        tagline: '100% Organic Bio-Stimulant & Root Enhancer',
        category: 'Bio-Stimulant',
        price: 990,
        originalPrice: 1250,
        discount: '21% OFF',
        stock: 310,
        crops: ['Paddy/Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Corn', 'Tomato', 'Grapes'],
        diseases: [],
        activeIngredient: 'Humic Acid 18% + Seaweed Extract (Ascophyllum nodosum)',
        dosage: '500ml per Acre',
        packSizes: ['500ml', '1 Litre', '5 Litres'],
        selectedPack: '1 Litre',
        badge: '100% Organic',
        rating: 4.9,
        reviewsCount: 310,
        image: './assets/p3.png',
        description:
                'Accelerates root branching, enhances micro-nutrient absorption, and restores degraded soils. Boosts drought resilience.',
        detailedDescription:
                'Stimulates root cell division and chelates bound soil nutrients into plant-absorbable forms.',
        targetUserId: 'USR-1006',
        targetUserName: 'Suresh Reddy (Sugarcane)',
        sortOrder: 4,
        createdAt: '2026-08-04T10:00:00.000Z',
        updatedAt: '2026-08-04T10:00:00.000Z'
  },
  {
        id: 'sb-26',
        name: 'Sathyam Bio WeedClear 24-D',
        tagline: 'Systemic Broadleaf Herbicide',
        category: 'Herbicide',
        price: 340,
        originalPrice: 400,
        discount: '15% OFF',
        stock: 150,
        crops: ['Wheat', 'Corn', 'Sugarcane'],
        diseases: ['Weeds'],
        activeIngredient: '2,4-D Amine Salt 58% SL',
        dosage: '400ml per Acre',
        packSizes: ['400ml', '1 Litre', '5 Litres'],
        selectedPack: '1 Litre',
        badge: 'Broadleaf Killer',
        rating: 4.6,
        reviewsCount: 156,
        image: './assets/p4.png',
        description:
                'Effective and economical post-emergence herbicide for control of broadleaf weeds in cereals and sugarcane.',
        detailedDescription:
                'Acts as a synthetic auxin, causing rapid, uncontrolled cell division and growth in susceptible weeds.',
        targetUserId: 'USR-1007',
        targetUserName: 'Gurpreet Singh (Wheat)',
        sortOrder: 5,
        createdAt: '2026-08-05T10:00:00.000Z',
        updatedAt: '2026-08-05T10:00:00.000Z'
  },
  {
        id: 'sb-27',
        name: 'Sathyam Bio AminoBoost Liquid',
        tagline: 'Advanced Amino Acid Bio-Stimulant',
        category: 'Bio-Stimulant',
        price: 460,
        originalPrice: 550,
        discount: '16% OFF',
        stock: 240,
        crops: ['Tomato', 'Cotton', 'Grapes', 'Citrus', 'Paddy/Rice'],
        diseases: [],
        activeIngredient: 'L-Amino Acids 20% + Seaweed Extract',
        dosage: '250ml per Acre',
        packSizes: ['250ml', '500ml', '1 Litre'],
        selectedPack: '500ml',
        badge: 'Stress Reliever',
        rating: 4.9,
        reviewsCount: 212,
        image: './assets/p3.png',
        description:
                'A powerful anti-stress bio-stimulant that helps crops recover from weather, transplant, and chemical stress.',
        detailedDescription:
                'Provides plants with ready-made L-amino acids, redirecting plant energy towards growth and flowering.',
        targetUserId: 'all',
        targetUserName: 'All Users (General Catalog)',
        sortOrder: 6,
        createdAt: '2026-08-06T10:00:00.000Z',
        updatedAt: '2026-08-06T10:00:00.000Z'
  }
  ];

const INITIAL_ORDERS = [
  {
        id: 'SB-ORD-8821',
        userId: 'USR-1001',
        customerName: 'Rameshwar Patel',
        customerPhone: '9876543210',
        address: 'Plot 42, Green Valley Farm, Karur, Tamil Nadu - 613001',
        items: [
          { id: 'sb-01', name: 'Sathyam Bio BlastShield 75 WP', qty: 2, price: 680, packSize: '500g' },
          { id: 'sb-04', name: 'Sathyam Bio RootVigor Gold', qty: 1, price: 990, packSize: '1 Litre' }
              ],
        subtotal: 2350,
        gst: 423,
        total: 2773,
        paymentMethod: 'Razorpay (UPI)',
        paymentStatus: 'Paid',
        deliveryStatus: 'Out for Delivery',
        assignedDeliveryBoy: 'Karthik Raja',
        deliveryBoyPhone: '9345678901',
        otp: '4829',
        createdAt: '2026-08-30T10:00:00.000Z'
  },
  {
        id: 'SB-ORD-8822',
        userId: 'USR-1007',
        customerName: 'Gurpreet Singh',
        customerPhone: '9814077889',
        address: 'Khasra 104, GT Road, Karnal, Haryana - 132001',
        items: [{ id: 'sb-02', name: 'Sathyam Bio FlyKill Ultra', qty: 3, price: 840, packSize: '250g' }],
        subtotal: 2520,
        gst: 453.6,
        total: 2973.6,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Pending',
        deliveryStatus: 'Dispatched',
        assignedDeliveryBoy: 'Karthik Raja',
        deliveryBoyPhone: '9345678901',
        otp: '9152',
        createdAt: '2026-08-30T12:30:00.000Z'
  }
  ];

const INITIAL_ADVISORY_SUBSCRIBERS = [
  {
        id: 'adv-101',
        name: 'Rameshwar Patel',
        phone: '9876543210',
        crop: 'Paddy/Rice',
        season: 'Kharif',
        acreage: 5,
        subscribedAt: '2026-08-25T10:30:00.000Z',
        status: 'Active',
        lastAdvisorySent: 'BlastShield Dosage Schedule (Week 4)'
  }
  ];

const INITIAL_INVENTORY = [
  {
        id: 'INV-01',
        sku: 'SB-BLAST-75',
        name: 'BlastShield 75 WP (500g)',
        batchNo: 'BATCH-2026-08A',
        warehouse: 'Warehouse 1 (Coimbatore)',
        stockQty: 420,
        minThreshold: 100,
        expiryDate: '2028-08-01',
        costPrice: 420,
        sellingPrice: 680
  },
  {
        id: 'INV-02',
        sku: 'SB-FLY-50',
        name: 'FlyKill Ultra (250g)',
        batchNo: 'BATCH-2026-07B',
        warehouse: 'Warehouse 1 (Coimbatore)',
        stockQty: 185,
        minThreshold: 50,
        expiryDate: '2028-07-15',
        costPrice: 530,
        sellingPrice: 840
  }
  ];

const INITIAL_STAFF_TASKS = [
  {
        id: 'TSK-301',
        title: 'Batch 2026-08A Quality Audit',
        assignedTo: 'Dr. K. Senthil (Agronomist)',
        priority: 'High',
        status: 'In Progress',
        dueDate: '2026-08-31'
  }
  ];

const INITIAL_TICKETS = [
  {
        id: 'TCK-901',
        farmerName: 'Rameshwar Patel',
        phone: '9876543210',
        crop: 'Paddy/Rice',
        subject: 'Leaf yellowing and blast patches in 25-day old paddy',
        category: 'Field Advisory',
        priority: 'High',
        status: 'In Progress',
        assignedTo: 'Dr. K. Senthil',
        createdAt: '2026-08-29T11:00:00.000Z',
        replies: [
          { from: 'Farmer', text: 'Leaves showing spindle shaped brown spots near tips.', time: '11:00 AM' },
          {
                    from: 'Dr. K. Senthil',
                    text: 'Apply Sathyam Bio BlastShield 75 WP @ 120g/acre mixed in 150L water immediately.',
                    time: '11:45 AM'
          }
              ]
  }
  ];

const INITIAL_CHAT_RECORDS = [
  {
        sessionId: 'CHAT-SESS-01',
        farmerName: 'Muthuvel K.',
        farmerPhone: '9234567890',
        channel: 'Web Live Chat',
        status: 'Active',
        updatedAt: '2026-08-30T14:40:00.000Z',
        messages: [
          {
                    sender: 'Farmer',
                    text: 'Hello, what is the best biological insecticide for cotton whitefly?',
                    timestamp: '02:30 PM'
          },
          {
                    sender: 'Sathyam Bio Bot',
                    text: 'Hello Muthuvel ji! We recommend Sathyam Bio FlyKill Ultra @ 250g per acre.',
                    timestamp: '02:30 PM'
          }
              ]
  }
  ];

async function seedIfEmpty() {
    const userCount = await User.estimatedDocumentCount();
    if (userCount > 0) return;

  console.log('Seeding Sathyam Bio database with initial demo data...');

  await User.insertMany(
        await Promise.all(INITIAL_USERS.map(async u => ({ ...u, _id: u.id, password: await hashPassword(u.password) })))
  );
    await Product.insertMany(INITIAL_PRODUCTS.map(p => ({ ...p, _id: p.id })));
    await Order.insertMany(INITIAL_ORDERS.map(o => ({ ...o, _id: o.id })));
    await AdvisorySubscriber.insertMany(INITIAL_ADVISORY_SUBSCRIBERS.map(a => ({ ...a, _id: a.id })));
    await InventoryItem.insertMany(INITIAL_INVENTORY.map(i => ({ ...i, _id: i.id })));
    await StaffTask.insertMany(INITIAL_STAFF_TASKS.map(t => ({ ...t, _id: t.id })));
    await Ticket.insertMany(INITIAL_TICKETS.map(t => ({ ...t, _id: t.id })));
    await ChatRecord.insertMany(INITIAL_CHAT_RECORDS.map(c => ({ ...c, _id: c.sessionId })));

  await Settings.findByIdAndUpdate(
        'global',
    {
            $set: {
                      cms: INITIAL_CMS,
                      catalogOptions: DEFAULT_CATALOG_OPTIONS,
                      profileFields: DEFAULT_PROFILE_FIELDS
            }
    },
    { upsert: true }
      );

  console.log('Sathyam Bio database seed complete.');
}

// ================= DATABASE MANAGER (Mongoose-backed) =================

class DatabaseManager {
    // ================= USERS TABLE =================

  async getUsers(filters = {}) {
        await connectDB();
        let result = (await User.find({}).lean()).map(u => serializeUser(u));

      if (filters.role && filters.role !== 'all') {
              result = result.filter(u => u.role.toLowerCase() === filters.role.toLowerCase());
      }

      if (filters.search) {
              const q = filters.search.toLowerCase().trim();
              result = result.filter(
                        u =>
                                    u.name?.toLowerCase().includes(q) ||
                                    u.phone?.includes(q) ||
                                    u.email?.toLowerCase().includes(q) ||
                                    u.village?.toLowerCase().includes(q) ||
                                    u.crop?.toLowerCase().includes(q)
                      );
      }

      if (filters.sortBy === 'name') {
              result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sortBy === 'recent') {
              result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else {
              result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const products = (await Product.find({}, { targetUserId: 1 }).lean());
        return result.map(user => {
                const targetProductCount = products.filter(p => p.targetUserId === user.id).length;
                return {
                          ...user,
                          targetProductCount
                };
        });
  }

  async getUserById(id, options = {}) {
        if (!id || typeof id !== 'string') return null;
        await connectDB();
        const u = await User.findById(id).lean();
        return serializeUser(u, options);
  }

  async getUserByIdentifier(identifier, options = {}) {
        // Coerce defensively: callers may pass a non-string from a JSON body.
        if (!identifier || typeof identifier !== 'string') return null;
        await connectDB();
        const clean = identifier.trim().toLowerCase();
        if (!clean) return null;
        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Fetch only the matching accounts instead of loading every user.
        const matches = (await User.find({
                $or: [{ phone: clean }, { email: new RegExp(`^${escaped}$`, 'i') }]
        }).lean()).map(u => serializeUser(u, options));

        // Legacy data can hold several accounts on one number; the newest one wins.
        matches.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return matches[0] || null;
  }

  async getProfileFields() {
        await connectDB();
        const settings = await Settings.findById('global').lean();
        // Normalised on every read, so a form saved by an older version still renders.
        return normalizeProfileFields((settings && settings.profileFields) || DEFAULT_PROFILE_FIELDS);
  }

  async saveProfileFields(fields) {
        await connectDB();
        const cleaned = normalizeProfileFields(fields);

      await Settings.findByIdAndUpdate('global', { $set: { profileFields: cleaned } }, { upsert: true });
        return cleaned;
  }

  async updateUserProfile(id, profileUpdates) {
        await connectDB();
        const user = await User.findById(id);
        if (!user) return null;

      const fields = await this.getProfileFields();
        // Only fields the admin left editable; the mobile number never is.
        const editable = fields.filter(field => field.editable && field.id !== 'phone').map(field => field.id);
        const { values, errors } = validateProfileValues(fields, profileUpdates, { only: editable, partial: true });
        const firstProblem = Object.values(errors)[0];
        if (firstProblem) throw inputError('INVALID_PROFILE', firstProblem);

      // Built-in answers live on the user (read by orders, advisories...);
        // answers to fields an admin added live under profile.
        const { core, profile } = splitProfileValues(values);
        if (core.acreage === null) core.acreage = 0;
        const existingProfile = (user.toObject().profile) || {};

      user.set(core);
        user.set('profile', { ...existingProfile, ...profile });
        user.set('updatedAt', new Date().toISOString());
        await user.save();

      return serializeUser(user.toObject());
  }

  // ================= SAVED DELIVERY ADDRESSES =================

  async getAddresses(userId) {
        if (!userId) return [];
        await connectDB();
        const user = await User.findById(String(userId), { addresses: 1 }).lean();
        return Array.isArray(user?.addresses) ? user.addresses : [];
  }

  async saveAddress(userId, address) {
        if (!userId) return [];
        await connectDB();
        const cleaned = {
            id: typeof address.id === 'string' && address.id ? address.id.slice(0, 40) : newId('ADDR'),
            label: String(address.label || 'Home').trim().slice(0, 30),
            doorNo: String(address.doorNo || '').trim().slice(0, 40),
            street: String(address.street || '').trim().slice(0, 120),
            area: String(address.area || '').trim().slice(0, 100),
            taluk: String(address.taluk || '').trim().slice(0, 80),
            pincode: String(address.pincode || '').replace(/\D/g, '').slice(0, 6),
            district: String(address.district || '').trim().slice(0, 80),
            state: String(address.state || '').trim().slice(0, 80),
            updatedAt: new Date().toISOString()
        };
        // Same fields checkout requires, so a saved address can always be used to order.
        if (!cleaned.doorNo || !cleaned.street || !cleaned.area || !cleaned.taluk || !/^\d{6}$/.test(cleaned.pincode) || !cleaned.district || !cleaned.state) {
            throw inputError('INVALID_ADDRESS', 'Please complete every delivery address field.');
        }
        const user = await User.findById(String(userId), { addresses: 1 });
        if (!user) return [];
        const addresses = (Array.isArray(user.addresses) ? user.addresses : []).filter(item => item.id !== cleaned.id);
        addresses.push(cleaned);
        user.set('addresses', addresses.slice(-20));
        await user.save();
        return addresses.slice(-20);
  }

  async deleteAddress(userId, addressId) {
        if (!userId || !addressId) return false;
        await connectDB();
        const user = await User.findById(String(userId), { addresses: 1 });
        if (!user) return false;
        const addresses = Array.isArray(user.addresses) ? user.addresses : [];
        const next = addresses.filter(item => item.id !== String(addressId));
        if (next.length === addresses.length) return false;
        user.set('addresses', next);
        await user.save();
        return true;
  }

  async createUser(userData) {
        await connectDB();

        // One account per mobile number, whichever path creates the user
        // (self-registration, admin panel, or /api/users).
        const phone = String(userData.phone || '').trim();
        if (phone) {
            const clash = await User.findOne({ phone }).lean();
            if (clash) {
                const err = new Error('This mobile number is already registered.');
                err.code = 'PHONE_TAKEN';
                throw err;
            }
        }

        const role = userData.role || 'farmer';
        if (!USER_ROLES.includes(role)) {
            throw inputError('INVALID_ROLE', 'Unknown user role.');
        }
        // Never fall back to a shared default password.
        const passwordIssues = passwordProblems(userData.password, { role, phone });
        if (passwordIssues.length) {
            throw inputError('WEAK_PASSWORD', weakPasswordMessage(passwordIssues));
        }

        const id = newId('USR');
        const newUser = {
                _id: id,
                id,
                name: userData.name || 'New User',
                // Omitted rather than '' so the unique phone index ignores email-only accounts.
                phone: phone || undefined,
                email: userData.email || '',
                password: await hashPassword(userData.password),
                role,
                // Only a caller that says nothing about these gets the sample
                // values; a blank answer is kept blank. An account made from a
                // mobile number alone must not claim a village it invented —
                // deliveries and advisories read these fields.
                crop: userData.crop ?? 'All Crops',
                acreage: Number(userData.acreage) || 0,
                village: userData.village ?? 'Farm Village',
                district: userData.district ?? 'Coimbatore',
                state: userData.state ?? 'Tamil Nadu',
                department: userData.department || '',
                status: userData.status || 'active',
                createdBy: userData.createdBy || 'admin',
                createdAt: new Date().toISOString(),
                lastLogin: null
        };
        if (userData.profile && typeof userData.profile === 'object') newUser.profile = userData.profile;

      const created = await User.create(newUser);
        return serializeUser(created.toObject());
  }

  async updateUser(id, updates) {
        await connectDB();
        const user = await User.findById(id);
        if (!user) return null;

      const { _id, id: _ignoredId, password, ...rest } = updates || {};
        if (rest.role !== undefined && !USER_ROLES.includes(rest.role)) {
            throw inputError('INVALID_ROLE', 'Unknown user role.');
        }
        if (typeof password === 'string' && password !== '') {
            if (isPasswordHash(password)) {
                rest.password = password;
            } else {
                const passwordIssues = passwordProblems(password, {
                    role: rest.role || user.get('role'),
                    phone: rest.phone ?? user.get('phone')
                });
                if (passwordIssues.length) {
                    throw inputError('WEAK_PASSWORD', weakPasswordMessage(passwordIssues));
                }
                rest.password = await hashPassword(password);
            }
        }
        if (rest.phone === '') {
            delete rest.phone;
            user.set('phone', undefined);
        }

      user.set({ ...rest, updatedAt: new Date().toISOString() });
        await user.save();
        return serializeUser(user.toObject());
  }

  // Removes every account holding this number. Used for whitelisted test
  // numbers, which re-register repeatedly and must not leave duplicates behind.
  async deleteUsersByPhone(phone) {
        if (!phone) return 0;
        await connectDB();
        const result = await User.deleteMany({ phone: String(phone) });
        return result.deletedCount || 0;
  }

  async deleteUser(id) {
        await connectDB();
        const user = await User.findById(id).lean();
        if (!user) return false;

      await Product.updateMany(
        { targetUserId: id },
        { $set: { targetUserId: 'all', targetUserName: 'All Users (General Catalog)' } }
            );

      await User.deleteOne({ _id: id });
        return true;
  }

  // ================= PRODUCTS TABLE =================

  async getProducts(options = {}) {
        await connectDB();
        const { userId, category, crop, disease, search, sortBy, onlineOnly } = options;
        let list = (await Product.find({}).lean()).map(serialize).map(normalizeProduct);

      // Offline products are sold at the billing counter only, never on the website.
      if (onlineOnly) {
              list = list.filter(p => p.online !== false);
      }

      if (category && category !== 'All') {
              list = list.filter(p => matchesCategory(p.category, category));
      }

      if (crop && crop !== 'all' && crop !== 'All Crops') {
              list = list.filter(p => matchesCrop(p.crops, crop));
      }

      if (disease && disease !== 'all') {
              list = list.filter(p => matchesDisease(p.diseases, disease));
      }

      if (search) {
              const q = search.toLowerCase().trim();
              list = list.filter(
                        p =>
                                    p.name.toLowerCase().includes(q) ||
                                    p.description?.toLowerCase().includes(q) ||
                                    p.activeIngredient?.toLowerCase().includes(q) ||
                                    p.category.toLowerCase().includes(q) ||
                                    p.targetUserName?.toLowerCase().includes(q)
                      );
      }

      if (userId) {
              const targetUser = await this.getUserById(userId);
              list.sort((a, b) => {
                        const aTarget = a.targetUserId === userId ? 1 : 0;
                        const bTarget = b.targetUserId === userId ? 1 : 0;
                        if (aTarget !== bTarget) return bTarget - aTarget;

                                if (targetUser && targetUser.crop && targetUser.crop !== 'All Crops') {
                                            const userCrop = targetUser.crop.toLowerCase();
                                            const aCropMatch = a.crops?.some(
                                                          c => userCrop.includes(c.toLowerCase()) || c.toLowerCase().includes(userCrop)
                                                        )
                                              ? 1
                                                          : 0;
                                            const bCropMatch = b.crops?.some(
                                                          c => userCrop.includes(c.toLowerCase()) || c.toLowerCase().includes(userCrop)
                                                        )
                                              ? 1
                                                          : 0;
                                            if (aCropMatch !== bCropMatch) return bCropMatch - aCropMatch;
                                }

                                return (a.sortOrder || 99) - (b.sortOrder || 99);
              });
      } else if (sortBy === 'user') {
              list.sort((a, b) => {
                        const aIsUser = a.targetUserId && a.targetUserId !== 'all' ? 1 : 0;
                        const bIsUser = b.targetUserId && b.targetUserId !== 'all' ? 1 : 0;
                        if (aIsUser !== bIsUser) return bIsUser - aIsUser;
                        return (a.targetUserName || '').localeCompare(b.targetUserName || '');
              });
      } else if (sortBy === 'price_asc') {
              list.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
              list.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'stock') {
              list.sort((a, b) => b.stock - a.stock);
      } else {
              list.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
      }

      return list;
  }

  async getProductById(id) {
        if (!id) return null;
        await connectDB();
        const p = await Product.findById(id).lean();
        if (!p) return null;
        return normalizeProduct(serialize(p));
  }

  async getCatalogOptions() {
        await connectDB();
        const settings = await Settings.findById('global').lean();
        return (settings && settings.catalogOptions) || DEFAULT_CATALOG_OPTIONS;
  }

  async registerCatalogOptions({ categories = [], crops = [], storageBatches = [], diseases = [] } = {}) {
        await connectDB();
        const current = await this.getCatalogOptions();
        const merge = (base, additions) => [
                ...new Set([...base, ...additions].map(value => String(value).trim()).filter(Boolean))
              ];
        const updated = {
                categories: merge(current.categories, categories),
                crops: merge(current.crops, crops),
                storageBatches: merge(current.storageBatches, storageBatches),
                diseases: merge(current.diseases || [], diseases)
        };
        await Settings.findByIdAndUpdate('global', { $set: { catalogOptions: updated } }, { upsert: true });
        return updated;
  }

  async createProduct(prodData) {
        await connectDB();
        const id = newId('sb');

      let targetUserName = 'All Users (General Catalog)';
      let targetUserPhone = '';
      if (prodData.targetUserId && prodData.targetUserId !== 'all') {
        const targetUser = await this.getUserById(prodData.targetUserId);
        if (targetUser) {
          targetUserName = `${targetUser.name} (${targetUser.crop || targetUser.role})`;
          targetUserPhone = targetUser.phone || '';
        }
      }

      const price = Number(prodData.price) || 0;
      const mrp = Number(prodData.originalPrice || prodData.mrp || price * 1.2);
      const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

      const newProd = {
        _id: id,
        id,
        name: prodData.name || 'New Bio Product',
        tagline: prodData.tagline || `${prodData.category || 'Agro'} Solution for High Yield`,
        category: prodData.category || 'Bio-Pesticide',
        price,
        originalPrice: mrp,
        discount: prodData.discount || `${discountPct}% OFF`,
        stock: Number(prodData.stock) || 0,
        crops: Array.isArray(prodData.crops)
          ? prodData.crops
          : typeof prodData.crops === 'string'
          ? prodData.crops.split(',').map(s => s.trim())
          : ['All Crops'],
        diseases: (Array.isArray(prodData.diseases)
          ? prodData.diseases
          : typeof prodData.diseases === 'string'
          ? prodData.diseases.split(',').map(s => s.trim())
          : []
        ).filter(Boolean),
        activeIngredient: prodData.activeIngredient || '100% Bio-Active Botanical Extract',
        dosage: prodData.dosage || '250g - 500g per Acre',
        packSizes:
          Array.isArray(prodData.packSizes) && prodData.packSizes.length
            ? prodData.packSizes
            : ['250g', '500g', '1kg'],
        selectedPack: prodData.selectedPack || '500g',
        badge: prodData.badge || (prodData.stock > 100 ? 'Best Seller' : 'New Launch'),
        images:
          Array.isArray(prodData.images) && prodData.images.length
            ? prodData.images
            : prodData.image
            ? [prodData.image]
            : [],
        image: prodData.image || prodData.images?.[0] || './assets/p1.png',
        howToUse: prodData.howToUse || '',
        whenToUse: prodData.whenToUse || '',
        relatedBlogs: Array.isArray(prodData.relatedBlogs) ? prodData.relatedBlogs : [],
        relatedProductIds: Array.isArray(prodData.relatedProductIds) ? prodData.relatedProductIds : [],
        reviewsEnabled: prodData.reviewsEnabled === true,
        reviews: Array.isArray(prodData.reviews) ? prodData.reviews : [],
        rating: null,
        reviewsCount: 0,
        description: prodData.description || 'High-performance bio-crop protection product.',
        detailedDescription:
          prodData.detailedDescription ||
          prodData.description ||
          'Scientifically formulated for modern organic and integrated pest management.',
        targetUserId: prodData.targetUserId || 'all',
        online: prodData.online !== false,
        targetUserName,
        targetUserPhone,
        sortOrder: Number(prodData.sortOrder) || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.registerCatalogOptions({
        categories: [newProd.category],
        crops: newProd.crops,
        storageBatches: newProd.packSizes,
        diseases: newProd.diseases
      });

      const created = await Product.create(newProd);
      return serialize(created.toObject());
  }

  async updateProduct(id, updates) {
      await connectDB();
      const existingDoc = await Product.findById(id).lean();
      if (!existingDoc) return null;
      const existing = serialize(existingDoc);

      let targetUserName = existing.targetUserName || 'All Users (General Catalog)';
      let targetUserPhone = existing.targetUserPhone || '';
      if (updates.targetUserId !== undefined) {
        if (updates.targetUserId === 'all' || !updates.targetUserId) {
          targetUserName = 'All Users (General Catalog)';
          targetUserPhone = '';
        } else {
          const targetUser = await this.getUserById(updates.targetUserId);
          targetUserName = targetUser ? `${targetUser.name} (${targetUser.crop || targetUser.role})` : updates.targetUserId;
          targetUserPhone = targetUser?.phone || '';
        }
      }

      const price = updates.price !== undefined ? Number(updates.price) : existing.price;
      const mrp =
        updates.originalPrice !== undefined || updates.mrp !== undefined
          ? Number(updates.originalPrice || updates.mrp)
          : existing.originalPrice;
      const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

      const merged = {
        ...existing,
        ...updates,
        targetUserName,
        targetUserPhone,
        price,
        originalPrice: mrp,
        discount: updates.discount || `${discountPct}% OFF`,
              stock: updates.stock !== undefined ? Number(updates.stock) : existing.stock,
              crops: updates.crops
                ? Array.isArray(updates.crops)
                          ? updates.crops
                          : updates.crops.split(',').map(s => s.trim())
                        : existing.crops,
              diseases: updates.diseases !== undefined
                ? (Array.isArray(updates.diseases)
                          ? updates.diseases
                          : updates.diseases.split(',').map(s => s.trim())
                        ).filter(Boolean)
                        : existing.diseases,
              images: updates.images
                ? Array.isArray(updates.images)
                          ? updates.images
                          : updates.images.split(',').map(s => s.trim())
                        : existing.images,
              image: updates.images?.[0] || updates.image || existing.image,
              howToUse: updates.howToUse !== undefined ? updates.howToUse : existing.howToUse,
              whenToUse: updates.whenToUse !== undefined ? updates.whenToUse : existing.whenToUse,
              relatedBlogs: updates.relatedBlogs !== undefined ? updates.relatedBlogs : existing.relatedBlogs,
              relatedProductIds:
                        updates.relatedProductIds !== undefined ? updates.relatedProductIds : existing.relatedProductIds,
              reviewsEnabled:
                        updates.reviewsEnabled !== undefined ? updates.reviewsEnabled === true : existing.reviewsEnabled,
              rating: null,
              reviewsCount: Array.isArray(existing.reviews) ? existing.reviews.length : 0,
              updatedAt: new Date().toISOString()
      };

      await Product.findByIdAndUpdate(id, { $set: merged }, { strict: false });

      await this.registerCatalogOptions({
              categories: [merged.category],
              crops: merged.crops,
              storageBatches: merged.packSizes,
              diseases: merged.diseases
      });

      return merged;
  }

  async deleteProduct(id) {
        await connectDB();
        const res = await Product.deleteOne({ _id: id });
        return res.deletedCount > 0;
  }

  async getUserProductSummary() {
        await connectDB();
        const users = (await User.find({}).lean()).map(serialize);
        const products = (await Product.find({}).lean()).map(serialize);

      return users.map(u => {
              const assignedProducts = products.filter(p => p.targetUserId === u.id);
              const matchingCropProducts = products.filter(
                        p => u.crop && p.crops && p.crops.some(c => u.crop.toLowerCase().includes(c.toLowerCase()))
                      );
              return {
                        userId: u.id,
                        userName: u.name,
                        role: u.role,
                        crop: u.crop,
                        acreage: u.acreage,
                        village: u.village,
                        assignedCount: assignedProducts.length,
                        assignedProducts: assignedProducts.map(p => ({ id: p.id, name: p.name, price: p.price })),
                        cropMatchCount: matchingCropProducts.length
              };
      });
  }

  // ================= ORDERS TABLE =================

  async getOrders() {
        await connectDB();
        const orders = (await Order.find({}).lean()).map(serialize);
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return orders;
  }

  async getOrderById(id) {
        if (!id) return null;
        await connectDB();
        const order = await Order.findById(String(id)).lean();
        return order ? serialize(order) : null;
  }

  async getOrderByRazorpayId(razorpayOrderId) {
        if (!razorpayOrderId) return null;
        await connectDB();
        const order = await Order.findOne({ razorpayOrderId: String(razorpayOrderId) }).lean();
        return order ? serialize(order) : null;
  }

  // A customer's orders: those placed from their account, plus any placed as a
  // guest with their verified mobile number.
  async getOrdersForCustomer(user) {
        await connectDB();
        const match = [{ userId: user.id }];
        if (user.phone) match.push({ customerPhone: user.phone });
        const orders = (await Order.find({ $or: match }).lean()).map(serialize);
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return orders;
  }

  async getProductsByIds(ids) {
        await connectDB();
        const unique = [...new Set((ids || []).map(String))];
        return (await Product.find({ _id: { $in: unique } }).lean()).map(serialize).map(normalizeProduct);
  }

  // Takes stock for every line or for none: if one line cannot be covered, the
  // lines already taken are put back. Returns the id of the product that ran out.
  async reserveStock(lines) {
        await connectDB();
        const taken = [];
        for (const line of lines) {
            const result = await Product.updateOne(
                { _id: line.id, stock: { $gte: line.qty } },
                { $inc: { stock: -line.qty }, $set: { updatedAt: new Date().toISOString() } }
            );
            if (!result.modifiedCount) {
                await this.releaseStock(taken);
                return { ok: false, productId: line.id };
            }
            taken.push(line);
        }
        return { ok: true };
  }

  async releaseStock(lines) {
        await connectDB();
        for (const line of lines) {
            await Product.updateOne({ _id: line.id }, { $inc: { stock: line.qty } });
        }
  }

  // ---- CART (one document per user, _id = userId) ----

  async getCart(userId) {
        if (!userId) return [];
        await connectDB();
        const doc = await Cart.findById(String(userId)).lean();
        return Array.isArray(doc?.items) ? doc.items : [];
  }

  async saveCart(userId, items) {
        if (!userId) return [];
        await connectDB();
        const safeItems = Array.isArray(items) ? items : [];
        await Cart.findByIdAndUpdate(
            String(userId),
            { items: safeItems, updatedAt: new Date().toISOString() },
            { upsert: true }
        );
        return safeItems;
  }

  async createOrder(orderData) {
        await connectDB();
        const id = newId('SB-ORD');
        const newOrder = {
                _id: id,
                id,
                userId: orderData.userId || 'USR-WALKIN',
                customerName: orderData.customerName || 'Farmer Customer',
                customerPhone: orderData.customerPhone || '9876543210',
                address: orderData.address || 'Farm Delivery Address',
                addressDetails: orderData.addressDetails || {},
                district: orderData.district || orderData.addressDetails?.district || '',
                state: orderData.state || orderData.addressDetails?.state || '',
                items: orderData.items || [],
                subtotal: Number(orderData.subtotal) || 0,
                gst: Number(orderData.gst) || 0,
                total: Number(orderData.total) || 0,
                paymentMethod: orderData.paymentMethod || 'Cash on Delivery',
                paymentStatus: orderData.paymentStatus || 'Pending',
                paymentId: orderData.paymentId || null,
                razorpayOrderId: orderData.razorpayOrderId || null,
                stockShortfall: orderData.stockShortfall === true,
                deliveryStatus: orderData.deliveryStatus || 'Confirmed',
                expectedDeliveryDate: orderData.expectedDeliveryDate || null,
                assignedDeliveryBoy: orderData.assignedDeliveryBoy || 'Karthik Raja',
                deliveryBoyPhone: orderData.deliveryBoyPhone || '9345678901',
                otp: crypto.randomInt(1000, 10000).toString(),
                createdAt: new Date().toISOString()
        };

      const created = await Order.create(newOrder);
        return serialize(created.toObject());
  }

  // Atomically marks an order notification as being sent, so concurrent callers
  // (checkout callback and webhook) can never both send it. A send stuck for 5
  // minutes (e.g. the function was killed) may be claimed again.
  async claimOrderNotification(orderId, kind, { resend = false, maxAttempts = 3 } = {}) {
        await connectDB();
        const path = `notifications.${kind}`;
        const now = new Date();
        const staleBefore = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

        const filter = {
            _id: String(orderId),
            $or: [{ [`${path}.status`]: { $ne: 'sending' } }, { [`${path}.attemptedAt`]: { $lt: staleBefore } }]
        };
        if (!resend) {
            filter[`${path}.status`] = { $ne: 'sent' };
            filter[`${path}.attempts`] = { $not: { $gte: maxAttempts } };
        }

        const result = await Order.updateOne(filter, {
            $set: { [`${path}.status`]: 'sending', [`${path}.attemptedAt`]: now.toISOString() },
            $inc: { [`${path}.attempts`]: 1 }
        });
        return result.modifiedCount === 1;
  }

  async recordOrderNotification(orderId, kind, status, error = '', { sender } = {}) {
        await connectDB();
        const path = `notifications.${kind}`;
        const now = new Date().toISOString();
        const set = {
            [`${path}.status`]: status,
            [`${path}.updatedAt`]: now,
            [`${path}.error`]: status === 'failed' ? String(error).slice(0, 200) : ''
        };
        if (status === 'sent') set[`${path}.sentAt`] = now;
        // Which WhatsApp number sent it (e.g. "sender 2"), for tracing a banned number.
        if (sender) set[`${path}.sender`] = sender;
        await Order.updateOne({ _id: String(orderId) }, { $set: set });
  }

  async updateOrder(id, updates) {
        await connectDB();
        const order = await Order.findById(id);
        if (!order) return null;

      order.set(updates);
        await order.save();
        return serialize(order.toObject());
  }

  // ================= CMS & ADVISORY =================

  async getCMS() {
        await connectDB();
        const settings = await Settings.findById('global').lean();
        return (settings && settings.cms) || {};
  }

  async updateCMS(updates) {
        await connectDB();
        const current = await this.getCMS();
        const merged = { ...current, ...updates };
        await Settings.findByIdAndUpdate('global', { $set: { cms: merged } }, { upsert: true });
        return merged;
  }

  async createUpload({ data, contentType, filename, uploadedBy }) {
        await connectDB();
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        await Upload.create({
              _id: id,
              data,
              contentType,
              filename: filename || '',
              size: Buffer.byteLength(data, 'base64'),
              uploadedBy: uploadedBy || '',
              createdAt: new Date().toISOString()
        });
        return id;
  }

  async getUpload(id) {
        await connectDB();
        return await Upload.findById(id).lean();
  }

  async getAdvisorySubscribers() {
        await connectDB();
        const subs = (await AdvisorySubscriber.find({}).lean()).map(serialize);
        subs.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
        return subs;
  }

  async addAdvisorySubscriber(sub) {
        await connectDB();
        const doc = { ...sub, _id: sub.id };
        const created = await AdvisorySubscriber.create(doc);
        return serialize(created.toObject());
  }

  async updateAdvisorySubscriber(id, patch) {
        await connectDB();
        const doc = await AdvisorySubscriber.findByIdAndUpdate(id, { $set: patch }, { returnDocument: 'after', lean: true });
        return doc ? serialize(doc) : null;
  }

  async setAdvisoryStatusByPhone(phone, status) {
        await connectDB();
        await AdvisorySubscriber.updateMany({ phone }, { $set: { status } });
  }

  // ---- Advisory broadcasts ----
  // A broadcast keeps its own snapshot of recipients, each with a delivery
  // status: queued -> sending -> sent | failed | skipped (or cancelled).

  async createAdvisoryBroadcast(broadcast) {
        await connectDB();
        const created = await AdvisoryBroadcast.create({ ...broadcast, _id: broadcast.id });
        return serialize(created.toObject());
  }

  async getAdvisoryBroadcast(id) {
        await connectDB();
        return serialize(await AdvisoryBroadcast.findById(id).lean());
  }

  // Newest first, without the recipient lists.
  async getAdvisoryBroadcasts(limit = 20) {
        await connectDB();
        const docs = await AdvisoryBroadcast.find({}, { recipients: 0 }).sort({ createdAt: -1 }).limit(limit).lean();
        return docs.map(serialize);
  }

  // Atomically moves one queued recipient to "sending" and returns it, or null
  // when none is left. Two parallel workers can never claim the same farmer.
  async claimBroadcastRecipient(id) {
        await connectDB();
        const token = crypto.randomUUID();
        const doc = await AdvisoryBroadcast.findOneAndUpdate(
            { _id: id, status: 'sending', 'recipients.status': 'queued' },
            { $set: { 'recipients.$.status': 'sending', 'recipients.$.claimedAt': new Date().toISOString(), 'recipients.$.claimToken': token } },
            { returnDocument: 'after', lean: true, projection: { recipients: { $elemMatch: { claimToken: token } } } }
        );
        return doc?.recipients?.[0] || null;
  }

  async setBroadcastRecipient(id, phone, fields) {
        await connectDB();
        const set = Object.fromEntries(Object.entries(fields).map(([k, v]) => [`recipients.$.${k}`, v]));
        await AdvisoryBroadcast.updateOne({ _id: id, 'recipients.phone': phone }, { $set: set });
  }

  // Recipients stuck in "sending" (their worker died) are marked failed, never
  // re-sent: the message may already have been delivered.
  async failStaleBroadcastRecipients(id, olderThanIso) {
        await connectDB();
        await AdvisoryBroadcast.updateOne(
            { _id: id },
            { $set: { 'recipients.$[r].status': 'failed', 'recipients.$[r].error': 'Delivery not confirmed (interrupted)' } },
            { arrayFilters: [{ 'r.status': 'sending', 'r.claimedAt': { $lt: olderThanIso } }] }
        );
  }

  async cancelAdvisoryBroadcast(id) {
        await connectDB();
        await AdvisoryBroadcast.updateOne(
            { _id: id, status: 'sending' },
            { $set: { status: 'cancelled', finishedAt: new Date().toISOString(), 'recipients.$[r].status': 'cancelled' } },
            { arrayFilters: [{ 'r.status': 'queued' }] }
        );
  }

  async updateAdvisoryBroadcast(id, patch, { onlyIfStatus } = {}) {
        await connectDB();
        await AdvisoryBroadcast.updateOne(onlyIfStatus ? { _id: id, status: onlyIfStatus } : { _id: id }, { $set: patch });
  }

  async getFarmerEnquiries() {
        await connectDB();
        const enquiries = (await FarmerEnquiry.find({}).lean()).map(serialize);
        enquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return enquiries;
  }

  async addFarmerEnquiry(enquiry) {
        await connectDB();
        const doc = { ...enquiry, _id: enquiry.id };
        const created = await FarmerEnquiry.create(doc);
        return serialize(created.toObject());
  }

  async getWishlists() {
        await connectDB();
        const items = await WishlistItem.find({}).lean();
        return items.map(serialize);
  }

  async setWishlistItem(item) {
        await connectDB();
        const key = item.userId || item.phone || `visitor-${Date.now()}`;
        const productId = String(item.productId || '');
        if (!productId) return this.getWishlists();
        const id = `${key}::${productId}`;

        if (item.saved) {
            await WishlistItem.findByIdAndUpdate(
                id,
                {
                    key,
                    userId: item.userId || '',
                    phone: item.phone || '',
                    productId,
                    productName: item.productName || '',
                    updatedAt: new Date().toISOString()
                },
                { upsert: true }
            );
        } else {
            await WishlistItem.findByIdAndDelete(id);
        }

        return this.getWishlists();
  }

  async getInventory() {
        await connectDB();
        const items = await InventoryItem.find({}).lean();
        return items.map(serialize);
  }

  async getStaffTasks() {
        await connectDB();
        const tasks = await StaffTask.find({}).lean();
        return tasks.map(serialize);
  }

  async getTickets() {
        await connectDB();
        const tickets = (await Ticket.find({}).lean()).map(serialize);
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return tickets;
  }

  async addTicket(ticket) {
        await connectDB();
        const doc = { ...ticket, _id: ticket.id };
        const created = await Ticket.create(doc);
        return serialize(created.toObject());
  }

  async getChatRecords() {
        await connectDB();
        const records = await ChatRecord.find({}).lean();
        return records.map(stripMongoFields);
  }

  async getWishlistForOwner(ownerId) {
        if (!ownerId) return [];
        await connectDB();
        const items = await WishlistItem.find({ $or: [{ key: ownerId }, { userId: ownerId }] }).lean();
        return items.map(serialize);
  }

  // ================= ADMIN DASHBOARD =================

  async getAdminStats() {
        await connectDB();
        // "Today" is the business day in India (UTC+5:30), not the server's UTC day.
        const IST_OFFSET_MS = 330 * 60 * 1000;
        const DAY_MS = 24 * 60 * 60 * 1000;
        const dayStartIso = new Date(Math.floor((Date.now() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS).toISOString();

        const [orders, totalProducts, activeProducts, subscribers, openTickets, wishlistSaves] = await Promise.all([
            Order.find({}, { total: 1, paymentStatus: 1, deliveryStatus: 1, createdAt: 1 }).lean(),
            Product.countDocuments({}),
            Product.countDocuments({ stock: { $gt: 0 } }),
            AdvisorySubscriber.countDocuments({}),
            Ticket.countDocuments({ status: { $nin: ['Closed', 'Resolved'] } }),
            WishlistItem.countDocuments({})
        ]);

        const paid = orders.filter(o => o.paymentStatus === 'Paid');
        return {
            totalRevenue: Math.round(paid.reduce((sum, o) => sum + (Number(o.total) || 0), 0) * 100) / 100,
            paidOrders: paid.length,
            totalOrders: orders.length,
            ordersToday: orders.filter(o => String(o.createdAt || '') >= dayStartIso).length,
            totalProducts,
            activeProducts,
            subscribers,
            openTickets,
            wishlistSaves,
            pendingDeliveries: orders.filter(o => !['Delivered', 'Cancelled'].includes(o.deliveryStatus)).length
        };
  }

  // ================= EPHEMERAL STATE =================

  async kvGet(key) {
        await connectDB();
        const doc = await Ephemeral.findById(key).lean();
        // MongoDB's TTL sweep only runs about once a minute, so check expiry here too.
        return doc && doc.purgeAt > new Date() ? doc.value : null;
  }

  async kvSet(key, value, ttlMs) {
        await connectDB();
        await Ephemeral.replaceOne(
            { _id: key },
            { _id: key, value, purgeAt: new Date(Date.now() + ttlMs) },
            { upsert: true }
        );
        return value;
  }

  async kvDelete(key) {
        await connectDB();
        await Ephemeral.deleteOne({ _id: key });
  }

  // Several kvGet lookups in one round trip. Returns a Map of key -> value,
  // holding only the keys that exist and have not expired.
  async kvGetMany(keys) {
        await connectDB();
        const docs = await Ephemeral.find({ _id: { $in: keys }, purgeAt: { $gt: new Date() } }).lean();
        return new Map(docs.map(doc => [doc._id, doc.value]));
  }

  // Claims the next turn on a paced resource (e.g. one WhatsApp number): it
  // succeeds only once the gap set by the previous claim has passed, so parallel
  // instances can never both take the same turn. Returns 0 when claimed,
  // otherwise the milliseconds until the resource frees up.
  async kvClaimSlot(key, gapMs) {
        await connectDB();
        const now = Date.now();
        try {
            await Ephemeral.findOneAndUpdate(
                { _id: key, $or: [{ 'value.nextAt': { $lte: now } }, { purgeAt: { $lte: new Date(now) } }] },
                { $set: { value: { nextAt: now + gapMs }, purgeAt: new Date(now + gapMs + 60 * 1000) } },
                { upsert: true }
            );
            return 0;
        } catch (err) {
            // The record exists and its turn is still taken, so the upsert collided.
            if (err?.code !== 11000) throw err;
            const doc = await Ephemeral.findById(key).lean();
            return Math.max(50, Number(doc?.value?.nextAt) - now || 50);
        }
  }

  // Atomically adds 1 to a numeric field inside the value. With upsert (the
  // default) a missing record is created; otherwise a missing record returns 0.
  // `by` may be negative, to give back a count that was taken for something
  // that then did not happen (see refundRateLimit).
  async kvIncrement(key, field, ttlMs, { upsert = true, by = 1 } = {}) {
        await connectDB();
        const doc = await Ephemeral.findOneAndUpdate(
            upsert ? { _id: key } : { _id: key, purgeAt: { $gt: new Date() } },
            { $inc: { [`value.${field}`]: by }, $setOnInsert: { purgeAt: new Date(Date.now() + ttlMs) } },
            { upsert, returnDocument: 'after', lean: true }
        );
        return Number(doc?.value?.[field]) || 0;
  }

  // Moves a record to a new status only if it is still in the expected one, so
  // two concurrent requests can never both claim it.
  async kvTransition(key, fromStatus, toStatus, extra = {}) {
        await connectDB();
        const set = { 'value.status': toStatus };
        for (const [field, value] of Object.entries(extra)) set[`value.${field}`] = value;
        const doc = await Ephemeral.findOneAndUpdate(
            { _id: key, purgeAt: { $gt: new Date() }, 'value.status': fromStatus },
            { $set: set },
            { returnDocument: 'after', lean: true }
        );
        return doc ? doc.value : null;
  }

  // ================= BILLING INVOICES =================

  async createInvoice(invoiceData) {
        await connectDB();
        const id = invoiceData.id || newId('INV');
        const created = await Invoice.create({ ...invoiceData, _id: id, id });
        return serialize(created.toObject());
  }

  async getInvoices() {
        await connectDB();
        const invoices = await Invoice.find({}).sort({ date: -1 }).lean();
        return invoices.map(serialize);
  }

  // ================= BLOGS TABLE =================

  async getBlogs(filters = {}) {
        await connectDB();
        let list = (await Blog.find(filters.publishedOnly ? { published: { $ne: false } } : {}).lean()).map(serialize);
        if (filters.category && filters.category !== 'All') {
            list = list.filter(b => b.category?.toLowerCase() === filters.category.toLowerCase());
        }
        if (filters.tag) {
            list = list.filter(b => Array.isArray(b.tags) && b.tags.some(t => String(t).toLowerCase() === filters.tag.toLowerCase()));
        }
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(b =>
                b.title?.toLowerCase().includes(q) ||
                b.summary?.toLowerCase().includes(q) ||
                b.content?.toLowerCase().includes(q) ||
                b.category?.toLowerCase().includes(q)
            );
        }
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return list;
  }

  async getBlogById(id) {
        if (!id) return null;
        await connectDB();
        const blog = await Blog.findById(String(id)).lean();
        return blog ? serialize(blog) : null;
  }

  async createBlog(data) {
        await connectDB();
        const id = newId('blog');
        const newBlog = {
            _id: id,
            id,
            title: data.title || 'Untitled Blog',
            slug: (data.slug || data.title || id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            summary: data.summary || '',
            content: data.content || '',
            coverImage: data.coverImage || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80',
            author: data.author || 'Sathyam Bio Agronomy Team',
            category: data.category || 'Crop Advisory',
            tags: splitTags(data.tags, ['Farming']),
            taggedProducts: Array.isArray(data.taggedProducts) ? data.taggedProducts : [],
            taggedVideos: Array.isArray(data.taggedVideos) ? data.taggedVideos : [],
            readTime: data.readTime || '3 min read',
            published: data.published !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const created = await Blog.create(newBlog);
        return serialize(created.toObject());
  }

  async updateBlog(id, updates) {
        await connectDB();
        const existing = await Blog.findById(String(id)).lean();
        if (!existing) return null;
        const { _id, id: _ignored, createdAt, ...rest } = updates;
        const merged = {
            ...serialize(existing),
            ...rest,
            tags: rest.tags !== undefined ? splitTags(rest.tags, []) : existing.tags,
            updatedAt: new Date().toISOString()
        };
        const { id: _mergedId, ...toSave } = merged;
        await Blog.findByIdAndUpdate(String(id), { $set: toSave }, { strict: false });
        return merged;
  }

  async deleteBlog(id) {
        await connectDB();
        const res = await Blog.deleteOne({ _id: String(id) });
        return res.deletedCount > 0;
  }

  // ================= VIDEOS TABLE =================

  async getVideos(filters = {}) {
        await connectDB();
        let list = (await Video.find({}).lean()).map(serialize);
        if (filters.category && filters.category !== 'All') {
            list = list.filter(v => v.category?.toLowerCase() === filters.category.toLowerCase());
        }
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(v =>
                v.title?.toLowerCase().includes(q) ||
                v.description?.toLowerCase().includes(q) ||
                v.category?.toLowerCase().includes(q)
            );
        }
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return list;
  }

  async getVideoById(id) {
        if (!id) return null;
        await connectDB();
        const video = await Video.findById(String(id)).lean();
        return video ? serialize(video) : null;
  }

  async createVideo(data) {
        await connectDB();
        const id = newId('vid');
        const newVideo = {
            _id: id,
            id,
            title: data.title || 'Untitled Video',
            description: data.description || '',
            videoUrl: data.videoUrl || '',
            thumbnail: data.thumbnail || '',
            category: data.category || 'Product Demo',
            tags: splitTags(data.tags, []),
            duration: data.duration || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const created = await Video.create(newVideo);
        return serialize(created.toObject());
  }

  async updateVideo(id, updates) {
        await connectDB();
        const existing = await Video.findById(String(id)).lean();
        if (!existing) return null;
        const { _id, id: _ignored, createdAt, ...rest } = updates;
        const merged = {
            ...serialize(existing),
            ...rest,
            tags: rest.tags !== undefined ? splitTags(rest.tags, []) : existing.tags,
            updatedAt: new Date().toISOString()
        };
        const { id: _mergedId, ...toSave } = merged;
        await Video.findByIdAndUpdate(String(id), { $set: toSave }, { strict: false });
        return merged;
  }

  async deleteVideo(id) {
        await connectDB();
        const res = await Video.deleteOne({ _id: String(id) });
        return res.deletedCount > 0;
  }
}

// Blog and video tags arrive as an array or as "a, b, c" from the admin form.
function splitTags(tags, fallback) {
    if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map(tag => tag.trim()).filter(Boolean);
    return fallback;
}

// Export singleton database instance
export const db = new DatabaseManager();
export default db;
