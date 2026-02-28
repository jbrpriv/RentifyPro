const twilio = require('twilio');

// Lazy-initialize client so the app doesn't crash if Twilio env vars are missing
// in development environments where SMS isn't configured yet
let client = null;

const getClient = () => {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️  Twilio credentials not configured. SMS will be skipped.');
      return null;
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

// ─── SMS Templates ────────────────────────────────────────────────────────────

const smsTemplates = {
  rentDueReminder: (propertyTitle, amount, dueDate) =>
    `RentifyPro: Your rent of Rs. ${Number(amount).toLocaleString()} for ${propertyTitle} is due on ${new Date(dueDate).toDateString()}. Log in to pay: ${process.env.CLIENT_URL}/dashboard/my-lease`,

  rentOverdue: (propertyTitle, amount) =>
    `RentifyPro: Your rent of Rs. ${Number(amount).toLocaleString()} for ${propertyTitle} is OVERDUE. A late fee may be applied. Please pay immediately: ${process.env.CLIENT_URL}/dashboard/my-lease`,

  lateFeeApplied: (propertyTitle, feeAmount) =>
    `RentifyPro: A late fee of Rs. ${Number(feeAmount).toLocaleString()} has been applied to your account for ${propertyTitle}. View details: ${process.env.CLIENT_URL}/dashboard/my-lease`,

  applicationAccepted: (propertyTitle) =>
    `RentifyPro: Congratulations! Your application for ${propertyTitle} was accepted. Sign your agreement: ${process.env.CLIENT_URL}/dashboard/my-lease`,

  applicationRejected: (propertyTitle) =>
    `RentifyPro: Your application for ${propertyTitle} was not accepted. Browse more properties: ${process.env.CLIENT_URL}/browse`,

  agreementSigned: (tenantName, propertyTitle) =>
    `RentifyPro: ${tenantName} has signed the agreement for ${propertyTitle}. View it: ${process.env.CLIENT_URL}/dashboard/agreements`,

  newApplication: (propertyTitle) =>
    `RentifyPro: New rental application received for ${propertyTitle}. Review it: ${process.env.CLIENT_URL}/dashboard/applications`,

  expiryWarning: (propertyTitle, expiryDate) =>
    `RentifyPro: Your lease for ${propertyTitle} expires on ${expiryDate}. Contact your landlord to discuss renewal.`,

  otp: (code) =>
    `RentifyPro: Your verification code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`,

  maintenanceUpdate: (title, status) =>
    `RentifyPro: Your maintenance request "${title}" has been updated to: ${status}.`,

  maintenanceReceived: (propertyTitle, tenantName) =>
    `RentifyPro: New maintenance request from ${tenantName} for ${propertyTitle}. Check your dashboard.`,
};

// ─── Core Send Function ───────────────────────────────────────────────────────

/**
 * Send an SMS message via Twilio
 * @param {string} to - Recipient phone number (e.g. "+923001234567")
 * @param {string} templateName - Key from smsTemplates object
 * @param {...any} args - Arguments passed to the template function
 * @returns {Promise<boolean>} true on success, false on failure
 */
const sendSMS = async (to, templateName, ...args) => {
  try {
    const twilioClient = getClient();

    // Silently skip if Twilio not configured (dev mode)
    if (!twilioClient) return false;

    // Validate phone number exists
    if (!to) {
      console.warn(`SMS skipped [${templateName}]: no phone number provided`);
      return false;
    }

    // Get the message body from template
    const template = smsTemplates[templateName];
    if (!template) {
      console.error(`SMS template not found: ${templateName}`);
      return false;
    }

    const body = template(...args);

    // Normalize phone number: ensure it has a + prefix
    const normalizedTo = to.startsWith('+') ? to : `+92${to.replace(/^0/, '')}`;

    await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedTo,
    });

    console.log(`SMS sent [${templateName}] → ${normalizedTo}`);
    return true;
  } catch (error) {
    // Never crash the app over a failed SMS
    console.error(`SMS failed [${templateName}] → ${to}:`, error.message);
    return false;
  }
};

// ─── OTP Functions (Twilio Verify API) ───────────────────────────────────────

/**
 * Send OTP via Twilio Verify Service (more reliable than manual SMS for OTP)
 * @param {string} phoneNumber - Phone number to send OTP to
 * @returns {Promise<boolean>}
 */
const sendOTP = async (phoneNumber) => {
  try {
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.warn('TWILIO_VERIFY_SERVICE_SID not configured. OTP not sent.');
      return false;
    }

    const twilioClient = getClient();
    if (!twilioClient) return false;

    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+92${phoneNumber.replace(/^0/, '')}`;

    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: normalizedPhone, channel: 'sms' });

    console.log(`OTP sent → ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('OTP send failed:', error.message);
    return false;
  }
};

/**
 * Verify OTP code via Twilio Verify Service
 * @param {string} phoneNumber - Phone number that received OTP
 * @param {string} code - OTP code entered by user
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (phoneNumber, code) => {
  try {
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) return false;

    const twilioClient = getClient();
    if (!twilioClient) return false;

    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+92${phoneNumber.replace(/^0/, '')}`;

    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: normalizedPhone, code });

    return result.status === 'approved';
  } catch (error) {
    console.error('OTP verify failed:', error.message);
    return false;
  }
};

module.exports = { sendSMS, sendOTP, verifyOTP };