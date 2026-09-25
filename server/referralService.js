// Refer & Earn, wired to the database. The rules live in referrals.js; this
// file applies them at signup, checkout, cancellation and delivery. Every
// claim is a conditional update, so a double click, a retry or a payment
// callback racing its webhook can never give a discount or a reward twice.

import crypto from 'node:crypto';
import { db } from './db.js';
import {
  REFERRAL_DEFAULTS, cleanReferralSettings, makeReferralCode, normalizeReferralCode,
  pointsBalance, pointsExpiry, priceRewards, sameAddress, monthStart, maskName,
} from './referrals.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadReferralSettings() {
  const saved = await db.getReferralSettings().catch(() => null);
  const { settings } = cleanReferralSettings(saved || {});
  return settings || { ...REFERRAL_DEFAULTS };
}

const isExpired = (referral, settings, now = Date.now()) =>
  Date.parse(referral.createdAt) + settings.pendingDays * DAY_MS < now;

// Links a new farmer to the friend whose code they entered. An unknown code,
// or the farmer's own, is ignored: signup never fails because of it.
export async function attachReferral(newUser, rawCode) {
  if (!String(rawCode ?? '').trim()) return null;
  const settings = await loadReferralSettings();
  if (!settings.enabled) return { applied: false, message: 'Referral rewards are paused right now.' };

  const referrer = await db.getFarmerByReferralCode(normalizeReferralCode(rawCode));
  if (!referrer || referrer.status === 'blocked' || referrer.status === 'inactive') {
    return { applied: false, message: 'That referral code was not found.' };
  }
  if (referrer.id === newUser.id || referrer.phone === newUser.phone) {
    return { applied: false, message: 'You cannot use your own referral code.' };
  }
  const referral = await db.createReferral({
    referrerId: referrer.id,
    referrerName: referrer.name || 'Farmer',
    referrerPhone: referrer.phone || '',
    referredId: newUser.id,
    referredName: newUser.name || 'Farmer',
    referredPhone: newUser.phone,
  });
  if (!referral) return { applied: false, message: 'This mobile number was already referred before.' };
  // Lets checkout skip the referral lookup for farmers nobody referred.
  await db.updateUser(newUser.id, { referredBy: referral.id });
  return { applied: true, referrerName: referrer.name || 'your friend', welcomeDiscount: settings.welcomeDiscount, minOrder: settings.minOrder };
}

// The welcome offer a signed-in farmer can still use, or null.
async function openWelcome(user, settings) {
  if (!user?.referredBy) return null;
  const referral = await db.getReferralForReferred(user.id);
  if (!referral || referral.status !== 'Pending' || referral.welcomeOrderId) return null;
  return isExpired(referral, settings) ? null : referral;
}

// What this farmer's cart costs after their welcome offer and (if asked)
// their points. Used for the checkout preview and for the order itself.
export async function quoteRewards(user, priced, usePoints) {
  const settings = await loadReferralSettings();
  const none = { rewards: priceRewards({ total: priced.total, settings: { ...settings, enabled: false } }), referral: null, balance: 0, settings };
  if (!user || user.role !== 'farmer' || !settings.enabled) return none;
  const fresh = await db.getUserById(user.id);
  const balance = pointsBalance(fresh);
  const referral = await openWelcome(fresh, settings);
  const rewards = priceRewards({ total: priced.total, welcome: !!referral, balance, usePoints: !!usePoints, settings });
  return { rewards, referral: rewards.welcomeDiscount > 0 ? referral : null, balance, settings };
}

// Takes the welcome offer and the points for an order about to be created.
// `strict` (cash on delivery): if either is gone, nothing is taken and the
// caller refuses the order. Not strict (already paid online): whatever can
// still be taken is taken, and the shortfall is reported for an admin.
export async function claimRewards(user, quote, { strict }) {
  const { rewards, referral } = quote;
  const token = `claim-${crypto.randomUUID()}`;
  let welcomeTaken = false;
  let pointsTaken = false;

  if (rewards.welcomeDiscount > 0 && referral) {
    welcomeTaken = !!(await db.updateReferralIf(referral.id, { status: 'Pending', welcomeOrderId: null }, { welcomeOrderId: token }));
  }
  if (rewards.pointsUsed > 0) {
    pointsTaken = await db.spendPoints(user.id, rewards.pointsUsed, 'Points used on an order', token);
  }

  const complete = (rewards.welcomeDiscount === 0 || welcomeTaken) && (rewards.pointsUsed === 0 || pointsTaken);
  if (!complete && strict) {
    await undoClaim(user.id, referral, token, { welcomeTaken, pointsTaken, pointsUsed: rewards.pointsUsed });
    return { ok: false };
  }
  return { ok: true, token, shortfall: !complete };
}

async function undoClaim(userId, referral, token, { welcomeTaken, pointsTaken, pointsUsed }) {
  if (welcomeTaken) await db.updateReferralIf(referral.id, { welcomeOrderId: token }, { welcomeOrderId: null }).catch(() => {});
  if (pointsTaken) await db.addPoints(userId, pointsUsed, 'Points returned: order not placed', { type: 'refund' }).catch(() => {});
}

// Once the order exists, the claim token is swapped for its id.
export async function bindClaim(quote, token, orderId) {
  if (quote.referral && quote.rewards.welcomeDiscount > 0) {
    await db.updateReferralIf(quote.referral.id, { welcomeOrderId: token }, { welcomeOrderId: orderId }).catch(() => {});
  }
}

export async function releaseClaim(user, quote, claim) {
  if (!claim?.token) return;
  await undoClaim(user.id, quote.referral, claim.token, {
    welcomeTaken: quote.rewards.welcomeDiscount > 0,
    pointsTaken: quote.rewards.pointsUsed > 0,
    pointsUsed: quote.rewards.pointsUsed,
  });
}

// The order fields that record the discount, for db.createOrder.
export function rewardOrderFields(quote, shortfall = false) {
  const { rewards, referral } = quote;
  if (!(rewards.discount > 0)) return {};
  return {
    itemsTotal: rewards.itemsTotal,
    discount: rewards.discount,
    welcomeDiscount: rewards.welcomeDiscount,
    pointsUsed: rewards.pointsUsed,
    referralId: rewards.welcomeDiscount > 0 ? referral?.id || null : null,
    rewardShortfall: shortfall,
    total: rewards.payable,
  };
}

// A cancelled order gives its points back and frees the welcome offer for the
// farmer's next order. Called once per cancellation (the status route's
// conditional update guarantees that).
export async function returnOrderRewards(order) {
  if (Number(order.pointsUsed) > 0 && order.userId) {
    await db.addPoints(order.userId, Number(order.pointsUsed), `Points returned: order ${order.id} cancelled`, { type: 'refund', orderId: order.id });
  }
  if (Number(order.welcomeDiscount) > 0 && order.referralId) {
    await db.updateReferralIf(order.referralId, { welcomeOrderId: order.id, status: 'Pending' }, { welcomeOrderId: null });
  }
}

// Re-opening a cancelled order takes its rewards again; false when they are
// no longer there (spent on another order), and nothing is taken.
export async function retakeOrderRewards(order) {
  let welcomeTaken = false;
  if (Number(order.welcomeDiscount) > 0 && order.referralId) {
    welcomeTaken = !!(await db.updateReferralIf(order.referralId, { status: 'Pending', welcomeOrderId: null }, { welcomeOrderId: order.id }));
    if (!welcomeTaken) return false;
  }
  if (Number(order.pointsUsed) > 0) {
    const ok = await db.spendPoints(order.userId, Number(order.pointsUsed), `Points used again: order ${order.id} re-opened`, order.id);
    if (!ok) {
      if (welcomeTaken) await db.updateReferralIf(order.referralId, { welcomeOrderId: order.id }, { welcomeOrderId: null }).catch(() => {});
      return false;
    }
  }
  return true;
}

// Runs whenever an order becomes Delivered. If it is a referred farmer's
// qualifying order, the referral completes and the referrer earns points,
// exactly once.
export async function settleReferralForOrder(order) {
  if (!order?.userId) return null;
  const referral = await db.getReferralForReferred(order.userId);
  if (!referral || referral.status !== 'Pending') return null;
  const settings = await loadReferralSettings();
  const now = Date.now();

  if (isExpired(referral, settings, now)) {
    await db.updateReferralIf(referral.id, { status: 'Pending' }, { status: 'Expired', closedAt: new Date(now).toISOString() });
    return null;
  }
  const itemsTotal = Number(order.itemsTotal ?? order.total) || 0;
  if (!settings.enabled || itemsTotal < settings.minOrder) return null;

  const referrerOrders = await db.getOrdersForUser(referral.referrerId);
  if (referrerOrders.some((o) => sameAddress(o.addressDetails, order.addressDetails))) {
    await db.updateReferralIf(referral.id, { status: 'Pending' }, {
      status: 'Rejected', orderId: order.id, closedAt: new Date(now).toISOString(),
      note: 'Delivered to the same address as the referrer.',
    });
    return null;
  }

  const rewardedThisMonth = await db.countRewardedReferrals(referral.referrerId, monthStart(now));
  const points = rewardedThisMonth < settings.monthlyCap ? settings.referrerPoints : 0;
  const done = await db.updateReferralIf(referral.id, { status: 'Pending' }, {
    status: 'Completed', orderId: order.id, completedAt: new Date(now).toISOString(), pointsAwarded: points,
    ...(points ? {} : { note: 'Monthly referral limit reached; no points.' }),
  });
  if (!done || !points) return done;

  await db.addPoints(referral.referrerId, points, `Referral reward: ${referral.referredName || 'a friend'}'s first order`, {
    type: 'referral', orderId: order.id, referralId: referral.id, expiresAt: pointsExpiry(settings, now),
  });
  return done;
}

// Admin undo for a reward found to be fraudulent: the referral is marked
// Reversed and the points come back off (as many as the referrer still has).
export async function reverseReferral(referralId, reason) {
  const referral = await db.getReferralById(referralId);
  if (!referral) return { status: 404, message: 'Referral not found.' };
  if (referral.status === 'Reversed') return { status: 409, message: 'This referral was already reversed.' };
  const done = await db.updateReferralIf(referral.id, { status: referral.status }, {
    status: 'Reversed', closedAt: new Date().toISOString(), note: reason || 'Reversed by admin.',
  });
  if (!done) return { status: 409, message: 'This referral just changed. Refresh the list.' };

  let pointsRemoved = 0;
  const awarded = Number(referral.pointsAwarded) || 0;
  if (referral.status === 'Completed' && awarded > 0) {
    const referrer = await db.getUserById(referral.referrerId);
    pointsRemoved = Math.min(awarded, Math.max(0, Math.floor(Number(referrer?.points) || 0)));
    if (pointsRemoved) {
      await db.addPoints(referral.referrerId, -pointsRemoved, `Referral reward reversed: ${reason || 'admin decision'}`, { type: 'reversed', referralId: referral.id });
    }
  }
  return { status: 200, referral: done, pointsRemoved };
}

// Everything the farmer's Refer & Earn card shows.
export async function referralSummary(user) {
  const settings = await loadReferralSettings();
  const code = await db.ensureReferralCode(user.id, makeReferralCode);
  const [fresh, mine, ledger, welcome] = await Promise.all([
    db.getUserById(user.id),
    db.getReferralsByReferrer(user.id),
    db.getPointsLedgerForUser(user.id, 30),
    db.getUserById(user.id).then((u) => openWelcome(u, settings)),
  ]);
  return {
    code,
    settings: {
      enabled: settings.enabled,
      welcomeDiscount: settings.welcomeDiscount,
      referrerPoints: settings.referrerPoints,
      minOrder: settings.minOrder,
      redeemMinOrder: settings.redeemMinOrder,
      redeemMaxPercent: settings.redeemMaxPercent,
    },
    points: pointsBalance(fresh),
    pointsExpireAt: pointsBalance(fresh) > 0 ? fresh?.pointsExpireAt || null : null,
    welcome: welcome ? { discount: settings.welcomeDiscount, minOrder: settings.minOrder } : null,
    // Only a masked name and the status: never the friend's phone.
    referrals: mine.map((r) => ({ id: r.id, name: maskName(r.referredName), status: r.status, pointsAwarded: Number(r.pointsAwarded) || 0, createdAt: r.createdAt })),
    ledger: ledger.map((l) => ({ id: l.id, points: l.points, type: l.type, description: l.description, createdAt: l.createdAt })),
  };
}
