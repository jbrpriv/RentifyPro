let admin = null;

// Lazy-init so app doesn't crash if Firebase not configured
const getAdmin = () => {
  if (!admin) {
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_PRIVATE_KEY ||
      !process.env.FIREBASE_CLIENT_EMAIL
    ) {
      console.warn('⚠️  Firebase credentials not configured. Push notifications will be skipped.');
      return null;
    }
    const firebase = require('firebase-admin');
    if (!firebase.apps.length) {
      firebase.initializeApp({
        credential: firebase.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    admin = firebase;
  }
  return admin;
};

// ─── Push Notification Templates ─────────────────────────────────────────────
const pushTemplates = {
  rentDueReminder:    (amount, property) => ({ title: '💰 Rent Due Soon',       body: `Rs. ${amount?.toLocaleString()} due for ${property}` }),
  rentOverdue:        (amount, property) => ({ title: '⚠️ Rent Overdue',         body: `Your rent of Rs. ${amount?.toLocaleString()} for ${property} is overdue` }),
  lateFeeApplied:     (fee, property)    => ({ title: '💸 Late Fee Applied',     body: `A late fee of Rs. ${fee} has been added for ${property}` }),
  newMessage:         (sender)           => ({ title: '💬 New Message',          body: `You have a new message from ${sender}` }),
  maintenanceUpdate:  (title, status)    => ({ title: '🔧 Maintenance Update',   body: `"${title}" is now ${status}` }),
  applicationUpdate:  (property, status) => ({ title: '📋 Application Update',  body: `Your application for ${property} was ${status}` }),
  agreementAction:    (action)           => ({ title: '📄 Agreement Update',     body: action }),
  disputeUpdate:      (title)            => ({ title: '⚖️ Dispute Update',       body: `Your dispute "${title}" has been updated` }),
  leaseExpiring:      (property, days)   => ({ title: '📅 Lease Expiring Soon',  body: `Your lease at ${property} expires in ${days} days` }),
};

/**
 * Send a push notification to a specific FCM token
 * @param {string} fcmToken - Device FCM token
 * @param {string} templateName - Key from pushTemplates
 * @param {...any} args - Template arguments
 */
const sendPush = async (fcmToken, templateName, ...args) => {
  try {
    const firebaseAdmin = getAdmin();
    if (!firebaseAdmin) return false;
    if (!fcmToken)      return false;

    const template = pushTemplates[templateName];
    if (!template) {
      console.error(`Push template not found: ${templateName}`);
      return false;
    }

    const { title, body } = template(...args);

    await firebaseAdmin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      android: { notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' } },
      apns:    { payload: { aps: { sound: 'default' } } },
    });

    console.log(`Push sent [${templateName}] → ${fcmToken.slice(0, 20)}...`);
    return true;
  } catch (error) {
    // Invalid/expired tokens return 'messaging/registration-token-not-registered'
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn(`Push token expired: ${fcmToken.slice(0, 20)}...`);
      // Caller should handle clearing the stale token from User record
      return 'token_expired';
    }
    console.error(`Push failed [${templateName}]:`, error.message);
    return false;
  }
};

/**
 * Send push to multiple tokens at once
 * @param {string[]} tokens
 * @param {string} templateName
 * @param {...any} args
 */
const sendPushMulticast = async (tokens, templateName, ...args) => {
  if (!tokens?.length) return;
  const results = await Promise.allSettled(
    tokens.map(token => sendPush(token, templateName, ...args))
  );
  return results;
};

module.exports = { sendPush, sendPushMulticast, pushTemplates };
