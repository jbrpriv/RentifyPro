const nodemailer = require('nodemailer');

// Lazy transporter — created on first use so a missing/wrong config
// does NOT crash the server on startup (just logs a warning when sending fails)
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const service = process.env.EMAIL_SERVICE;
  const user    = process.env.EMAIL_USER;
  const pass    = process.env.EMAIL_PASS;

  if (!service || !user || !pass) {
    console.warn('⚠️  Email not configured (EMAIL_SERVICE / EMAIL_USER / EMAIL_PASS missing). Emails will be skipped.');
    return null;
  }

  _transporter = nodemailer.createTransport({ service, auth: { user, pass } });
  return _transporter;
};

// Base HTML template for all emails
const baseTemplate = (content) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: #2563eb; color: white; padding: 24px 32px; }
      .header h1 { margin: 0; font-size: 24px; }
      .body { padding: 32px; color: #374151; line-height: 1.6; }
      .button { display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
      .footer { background: #f9fafb; padding: 16px 32px; text-align: center; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb; }
      .detail-box { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 16px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>🏠 RentifyPro</h1></div>
      <div class="body">${content}</div>
      <div class="footer">© ${new Date().getFullYear()} RentifyPro. This is an automated message.</div>
    </div>
  </body>
  </html>
`;

// ─── Email Templates ────────────────────────────────────────────────

const templates = {

    // Sent to tenant when a new agreement is created
    agreementCreated: (tenantName, landlordName, propertyTitle, startDate, endDate, rentAmount) => ({
        subject: `New Rental Agreement - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${tenantName},</h2>
      <p>A new rental agreement has been created for you by <strong>${landlordName}</strong>.</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}<br/>
        <strong>Lease Start:</strong> ${new Date(startDate).toDateString()}<br/>
        <strong>Lease End:</strong> ${new Date(endDate).toDateString()}<br/>
        <strong>Monthly Rent:</strong> Rs. ${Number(rentAmount).toLocaleString()}
      </div>
      <p>Please log in to RentifyPro to review and sign your agreement.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/agreements" class="button">View Agreement</a>
    `)
    }),
    newApplication: (landlordName, tenantName, propertyTitle) => ({
        subject: `New Application Received - ${propertyTitle}`,
        html: baseTemplate(`
    <h2>Hello ${landlordName},</h2>
    <p>You have received a new rental application from <strong>${tenantName}</strong>.</p>
    <div class="detail-box">
      <strong>Property:</strong> ${propertyTitle}<br/>
      <strong>Applicant:</strong> ${tenantName}
    </div>
    <p>Log in to review and respond to this application.</p>
    <a href="${process.env.CLIENT_URL}/dashboard/applications" class="button">Review Application</a>
  `)
    }),

    applicationAccepted: (tenantName, propertyTitle) => ({
        subject: `Application Accepted - ${propertyTitle}`,
        html: baseTemplate(`
    <h2>Congratulations ${tenantName}! 🎉</h2>
    <p>Your rental application for <strong>${propertyTitle}</strong> has been <strong>accepted</strong>.</p>
    <p>A rental agreement has been created for you. Please log in to review and sign it.</p>
    <a href="${process.env.CLIENT_URL}/dashboard/my-lease" class="button">View & Sign Agreement</a>
  `)
    }),

    applicationRejected: (tenantName, propertyTitle) => ({
        subject: `Application Update - ${propertyTitle}`,
        html: baseTemplate(`
    <h2>Hello ${tenantName},</h2>
    <p>Thank you for your interest in <strong>${propertyTitle}</strong>.</p>
    <p>Unfortunately, the landlord has chosen another applicant at this time.</p>
    <p>Please continue browsing other available properties on RentifyPro.</p>
    <a href="${process.env.CLIENT_URL}/browse" class="button">Browse Listings</a>
  `)
    }),
    // Sent to landlord when tenant signs
    agreementSigned: (landlordName, tenantName, propertyTitle) => ({
        subject: `Agreement Signed - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${landlordName},</h2>
      <p>Good news! <strong>${tenantName}</strong> has signed the rental agreement for:</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}
      </div>
      <p>The agreement is now active. You can download the signed copy from your dashboard.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/agreements" class="button">View Agreements</a>
    `)
    }),

    // Rent due reminder
    rentDueReminder: (tenantName, propertyTitle, amount, dueDate) => ({
        subject: `Rent Due Reminder - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${tenantName},</h2>
      <p>This is a friendly reminder that your rent is due soon.</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}<br/>
        <strong>Amount Due:</strong> Rs. ${Number(amount).toLocaleString()}<br/>
        <strong>Due Date:</strong> ${new Date(dueDate).toDateString()}
      </div>
      <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
    `)
    }),

    // Welcome email on registration
    welcome: (userName, role) => ({
        subject: 'Welcome to RentifyPro!',
        html: baseTemplate(`
      <h2>Welcome, ${userName}! 🎉</h2>
      <p>Your account has been created successfully as a <strong>${role}</strong>.</p>
      <p>Here's what you can do next:</p>
      ${role === 'landlord'
                ? '<p>➡️ Add your first property and generate a rental agreement.</p>'
                : '<p>➡️ Check your dashboard to view any agreements sent to you.</p>'
            }
      <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
    `)
    }),

    expiryWarning: (name, propertyTitle, expiryDate, role) => ({
        subject: `Lease Expiring Soon - ${propertyTitle}`,
        html: baseTemplate(`
    <h2>Hello ${name},</h2>
    <p>This is a reminder that the rental agreement for <strong>${propertyTitle}</strong> 
    is expiring in <strong>30 days</strong>.</p>
    <div class="detail-box">
      <strong>Property:</strong> ${propertyTitle}<br/>
      <strong>Expiry Date:</strong> ${expiryDate}
    </div>
    ${role === 'landlord'
                ? '<p>Please contact your tenant to discuss renewal or next steps.</p>'
                : '<p>Please contact your landlord to discuss renewal or find alternative arrangements.</p>'
            }
    <a href="${process.env.CLIENT_URL}/dashboard/agreements" class="button">View Agreement</a>`)
    }),

    newMaintenanceRequest: (recipientName, tenantName, propertyTitle, requestTitle, priority) => ({
        subject: `New Maintenance Request - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${recipientName},</h2>
      <p>A new maintenance request has been submitted by <strong>${tenantName}</strong>.</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}<br/>
        <strong>Issue:</strong> ${requestTitle}<br/>
        <strong>Priority:</strong> <span style="color:${priority === 'urgent' ? '#dc2626' : priority === 'medium' ? '#d97706' : '#16a34a'}">${priority.toUpperCase()}</span>
      </div>
      <p>Log in to review and update the request status.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/maintenance" class="button">View Request</a>
    `)
    }),

    maintenanceUpdate: (tenantName, requestTitle, newStatus) => ({
        subject: `Maintenance Update - ${requestTitle}`,
        html: baseTemplate(`
      <h2>Hello ${tenantName},</h2>
      <p>Your maintenance request has been updated.</p>
      <div class="detail-box">
        <strong>Request:</strong> ${requestTitle}<br/>
        <strong>New Status:</strong> ${newStatus.replace('_', ' ').toUpperCase()}
      </div>
      <p>Log in for more details.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/maintenance" class="button">View Request</a>
    `)
    }),

    paymentConfirmed: (tenantName, propertyTitle, amount) => ({
        subject: `Payment Confirmed - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${tenantName},</h2>
      <p>Your payment has been confirmed and your lease is now <strong>active</strong>.</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}<br/>
        <strong>Amount Paid:</strong> Rs. ${Number(amount).toLocaleString()}
      </div>
      <p>Your full rent schedule is now available in your dashboard.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/my-lease" class="button">View Lease & Schedule</a>
    `)
    }),

    // Sent on registration — link to verify email address
    emailVerification: (userName, verifyUrl) => ({
        subject: 'Verify your RentifyPro email address',
        html: baseTemplate(`
      <h2>Hello ${userName},</h2>
      <p>Thanks for signing up! Please verify your email address to activate your account.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" class="button">Verify Email</a>
      <p style="margin-top:24px;color:#6b7280;font-size:13px;">
        If you did not create a RentifyPro account, you can safely ignore this email.
      </p>
    `)
    }),

    // Sent when user requests a password reset
    passwordReset: (userName, resetUrl) => ({
        subject: 'Reset your RentifyPro password',
        html: baseTemplate(`
      <h2>Hello ${userName},</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p style="margin-top:24px;color:#6b7280;font-size:13px;">
        If you did not request a password reset, please ignore this email — your password will not change.
      </p>
    `)
    }),

    // OTP code email (for 2FA disable, phone verify fallback, etc.)
    emailOTP: (userName, otpCode) => ({
        subject: 'RentifyPro – Your Verification Code',
        html: baseTemplate(`
      <h2>Hello ${userName},</h2>
      <p>Your one-time verification code is:</p>
      <div class="detail-box" style="text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;">${otpCode}</div>
      <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    `)
    }),

    // PM invitation from landlord
    pmInvitation: (pmName, landlordName, propertyTitle, propertyId) => ({
        subject: `Property Management Invitation – ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${pmName},</h2>
      <p><strong>${landlordName}</strong> has invited you to manage their property:</p>
      <div class="detail-box"><strong>${propertyTitle}</strong></div>
      <p>Please log in to your RentifyPro dashboard to accept or decline this invitation.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/pm/properties" class="button">Review Invitation</a>
    `)
    }),

    // Sent to tenant when landlord proposes a lease renewal
    renewalProposed: (tenantName, propertyTitle, newEndDate, newRentAmount) => ({
        subject: `Lease Renewal Proposed - ${propertyTitle}`,
        html: baseTemplate(`
      <h2>Hello ${tenantName},</h2>
      <p>Your landlord has proposed a lease renewal for <strong>${propertyTitle}</strong>.</p>
      <div class="detail-box">
        <strong>Property:</strong> ${propertyTitle}<br/>
        <strong>Proposed New End Date:</strong> ${new Date(newEndDate).toDateString()}<br/>
        <strong>Proposed Rent:</strong> Rs. ${Number(newRentAmount).toLocaleString()} / month
      </div>
      <p>Please log in to accept or decline the renewal proposal.</p>
      <a href="${process.env.CLIENT_URL}/dashboard/agreements" class="button">Review Proposal</a>
    `)
    }),

};

// ─── Send Function ──────────────────────────────────────────────────

const sendEmail = async (to, templateName, ...args) => {
  try {
    const transport = getTransporter();
    if (!transport) return false; // Email not configured — silently skip

    const template = templates[templateName];
    if (!template) {
      console.error(`Email template not found: ${templateName}`);
      return false;
    }

    const { subject, html } = template(...args);

    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log(`Email sent [${templateName}] → ${to}`);
    return true;
  } catch (error) {
    // Never crash the app over a failed email
    console.error(`Email failed [${templateName}] → ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendEmail };