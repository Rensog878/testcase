/**
 * Crop advisory broadcasts: who gets which WhatsApp advisory.
 *
 * Subscribers pick a crop from a free-text label ("Paddy / Rice Farmer",
 * "Paddy/Rice", "Tomato"...), so labels are folded into a small set of crop
 * groups. An admin targets one or more groups (and optionally seasons), and
 * each farmer gets the message personalised with their own name and crop.
 *
 * Pure functions only, so the rules can be tested without a database.
 */

export const CROP_GROUPS = [
  { key: 'paddy', label: 'Paddy / Rice', match: /paddy|rice|nel|dhan/i },
  { key: 'cotton', label: 'Cotton', match: /cotton|kapas|paruthi/i },
  { key: 'sugarcane', label: 'Sugarcane', match: /sugar\s*cane|sugarcane|karumbu|ganna/i },
  {
    key: 'horticulture',
    label: 'Horticulture / Vegetables',
    match: /horti|vegetable|tomato|chilli|chili|onion|brinjal|okra|bhindi|potato|banana|mango|fruit|flower/i,
  },
  { key: 'mixed', label: 'Mixed Crop', match: /mixed|multi/i },
];
export const OTHER_GROUP = { key: 'other', label: 'Other crops' };

export const SUBSCRIBER_STATUSES = ['Active', 'Unsubscribed'];
export const SEASONS = ['Kharif', 'Rabi', 'Zaid'];

// Starting points the admin edits before sending; one per crop group.
export const ADVISORY_TEMPLATES = {
  paddy: `🌾 Vanakkam {name},

Paddy advisory for {season}:
• Watch for leaf blast (eye-shaped spots on leaves) in humid weather.
• Keep 2–5 cm of standing water after transplanting; drain before top-dressing.
• Split nitrogen into 3 doses — do not apply it all at once.

For your {acres} acre(s), ask us for the right dose. Reply to this message for help.`,
  cotton: `🌱 Vanakkam {name},

Cotton advisory for {season}:
• Check the underside of leaves weekly for whitefly and jassids.
• Install 5 pheromone traps per acre to track pink bollworm.
• Avoid excess nitrogen — it invites sucking pests.

Reply to this message for a spray schedule for your {acres} acre(s).`,
  sugarcane: `🎋 Vanakkam {name},

Sugarcane advisory for {season}:
• Look for dead hearts — a sign of early shoot borer.
• Earth up at 90 days and remove dry lower leaves.
• Irrigate every 7–10 days in dry weeks.

Reply to this message for help with your {acres} acre(s).`,
  horticulture: `🍅 Vanakkam {name},

{crop} advisory for {season}:
• Remove and destroy leaves with early blight spots.
• Stake plants and keep the base free of weeds.
• Water at the root in the morning, not over the leaves.

Reply to this message for the right treatment for your {acres} acre(s).`,
  mixed: `🌿 Vanakkam {name},

Crop advisory for {season}:
• Scout your fields twice a week for pests and leaf spots.
• Rotate crops to break pest and disease cycles.
• Test your soil before the next sowing.

Reply to this message and we will guide you crop by crop.`,
  other: `🌿 Vanakkam {name},

{crop} advisory for {season}:
• Scout your field twice a week for pests and leaf spots.
• Use only the recommended dose of any spray.

Reply to this message for advice on your {acres} acre(s).`,
};

export const MESSAGE_MAX_LENGTH = 1500;
export const TITLE_MAX_LENGTH = 80;
export const OPT_OUT_FOOTER = '— Sathyam Bio Crop Advisory\nNo longer want these tips? Reply STOP.';

// The crop group a subscriber's crop label belongs to.
export function cropGroupKey(crop) {
  const text = String(crop || '');
  return (CROP_GROUPS.find((group) => group.match.test(text)) || OTHER_GROUP).key;
}

export function cropGroupLabel(key) {
  return (CROP_GROUPS.find((group) => group.key === key) || OTHER_GROUP).label;
}

export function isActiveSubscriber(sub) {
  return !sub?.status || sub.status === 'Active';
}

const normSeason = (season) => String(season || '').trim().toLowerCase();

// One record per phone number: a farmer who subscribed twice is known by their
// most recent sign-up (its crop, season and whether they are still active).
export function latestPerPhone(subscribers) {
  const byPhone = new Map();
  for (const sub of subscribers || []) {
    if (!/^[6-9]\d{9}$/.test(String(sub?.phone || ''))) continue;
    const seen = byPhone.get(sub.phone);
    if (!seen || new Date(sub.subscribedAt || 0) >= new Date(seen.subscribedAt || 0)) byPhone.set(sub.phone, sub);
  }
  return [...byPhone.values()];
}

// Active farmers in the chosen crop groups and seasons (empty = all seasons),
// each at most once.
export function selectRecipients(subscribers, { crops = [], seasons = [] } = {}) {
  const cropSet = new Set(crops);
  const seasonSet = new Set(seasons.map(normSeason).filter(Boolean));
  return latestPerPhone(subscribers).filter((sub) => isActiveSubscriber(sub)
    && cropSet.has(cropGroupKey(sub.crop))
    && (!seasonSet.size || seasonSet.has(normSeason(sub.season))));
}

// Unregistered farmers are saved as "Farmer Partner"; greet them without a fake name.
function greetingName(name) {
  const clean = String(name || '').trim();
  return clean && clean !== 'Farmer Partner' ? clean : 'Farmer';
}

// Fills {name}, {crop}, {season} and {acres} for one farmer and adds the opt-out footer.
export function renderAdvisory(template, sub) {
  const values = {
    name: greetingName(sub?.name),
    crop: String(sub?.crop || '').replace(/\s*farmer$/i, '').trim() || 'your crop',
    season: String(sub?.season || '').trim() || 'this season',
    acres: String(Number(sub?.acreage ?? sub?.acres) || 1),
  };
  const body = String(template || '').replace(/\{(name|crop|season|acres)\}/gi, (_, key) => values[key.toLowerCase()]);
  return `${body.trim()}\n\n${OPT_OUT_FOOTER}`;
}

// Validates an admin's broadcast request. Returns { title, message, crops, seasons } or throws a message.
export function parseBroadcastRequest(body) {
  const message = String(body?.message || '').replace(/\r\n/g, '\n').trim();
  const title = String(body?.title || '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX_LENGTH);
  const known = new Set([...CROP_GROUPS.map((g) => g.key), OTHER_GROUP.key]);
  const crops = [...new Set(Array.isArray(body?.crops) ? body.crops : [])].filter((key) => known.has(key));
  const seasons = [...new Set((Array.isArray(body?.seasons) ? body.seasons : []).map((s) => String(s).trim().slice(0, 30)).filter(Boolean))];

  if (!crops.length) throw new Error('Choose at least one crop to send the advisory to.');
  if (message.length < 10) throw new Error('Write the advisory message (at least 10 characters).');
  if (message.length > MESSAGE_MAX_LENGTH) throw new Error(`Keep the advisory under ${MESSAGE_MAX_LENGTH} characters.`);

  return { title: title || `${crops.map(cropGroupLabel).join(', ')} advisory`, message, crops, seasons };
}

// Totals of a broadcast's recipients by delivery status.
export function broadcastCounts(recipients) {
  const counts = { total: 0, queued: 0, sending: 0, sent: 0, failed: 0, skipped: 0, cancelled: 0 };
  for (const r of recipients || []) {
    counts.total++;
    if (counts[r.status] !== undefined) counts[r.status]++;
  }
  return counts;
}

// Replies that opt a farmer out of, or back into, advisories. Matched on the
// whole message, so "please stop the spray?" in a normal chat never unsubscribes.
const STOP_WORDS = /^(stop|unsubscribe|stop advisory|நிறுத்து|रोको|ఆపు|ನಿಲ್ಲಿಸಿ)[\s.!]*$/iu;
const START_WORDS = /^(start|subscribe|resume)[\s.!]*$/iu;

// Reads a WaSender incoming-message webhook. Returns
// { id, phone, intent: 'stop' | 'start' } for an opt-out/opt-in reply, else null.
export function parseOptOutWebhook(payload) {
  if (!/^messages\.(received|upsert)$/.test(String(payload?.event || ''))) return null;
  const raw = payload?.data?.messages;
  const msg = Array.isArray(raw) ? raw[0] : raw;
  const key = msg?.key || {};
  if (!msg || key.fromMe) return null;

  const text = String(msg.messageBody ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '').trim();
  const intent = STOP_WORDS.test(text) ? 'stop' : START_WORDS.test(text) ? 'start' : null;
  if (!intent) return null;

  const pn = [key.cleanedSenderPn, key.senderPn, key.remoteJid].find((v) => v && !String(v).includes('@lid') && !String(v).includes('@g.us'));
  const digits = String(pn || '').split('@')[0].replace(/\D/g, '');
  const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(phone)) return null;
  return { id: String(key.id || ''), phone, intent };
}
