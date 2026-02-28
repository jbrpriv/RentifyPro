const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const Agreement      = require('../models/Agreement');
const User           = require('../models/User');
const { sendPush }   = require('../utils/firebaseService');

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { type, data } = job.data;
    console.log(`Processing job [${type}] - Job ID: ${job.id}`);

    // Helper: send push if user has FCM token
    const pushToUser = async (userId, template, ...args) => {
      try {
        const u = await User.findById(userId).select('fcmToken');
        if (u?.fcmToken) await sendPush(u.fcmToken, template, ...args);
      } catch {}
    };

    switch (type) {

      case 'RENT_DUE_REMINDER': {
        const { agreementId, dueDate } = data;

        const agreement = await Agreement.findById(agreementId)
          .populate('tenant', 'name email phoneNumber smsOptIn')
          .populate('property', 'title');

        if (!agreement) throw new Error(`Agreement ${agreementId} not found`);

        if (agreement.status !== 'active') {
          console.log(`Skipping reminder — agreement ${agreementId} is ${agreement.status}`);
          return;
        }

        const { tenant, property, financials } = agreement;

        // Always send email
        await sendEmail(
          tenant.email,
          'rentDueReminder',
          tenant.name,
          property.title,
          financials.rentAmount,
          dueDate
        );

        // Send SMS only if tenant has opted in
        if (tenant.smsOptIn && tenant.phoneNumber) {
          await sendSMS(
            tenant.phoneNumber,
            'rentDueReminder',
            property.title,
            financials.rentAmount,
            dueDate
          );
        }

        // Log to audit trail
        agreement.auditLog.push({
          action: 'REMINDER_SENT',
          timestamp: new Date(),
          details: `Rent due reminder sent for ${dueDate}`,
        });
        await agreement.save();
        break;
      }

      case 'RENT_OVERDUE': {
        const { agreementId } = data;

        const agreement = await Agreement.findById(agreementId)
          .populate('tenant', 'name email phoneNumber smsOptIn')
          .populate('property', 'title');

        if (!agreement || agreement.status !== 'active') return;

        const { tenant, property, financials } = agreement;

        await sendEmail(
          tenant.email,
          'rentDueReminder', // Reuse template, overdue version
          tenant.name,
          property.title,
          financials.rentAmount,
          new Date()
        );

        if (tenant.smsOptIn && tenant.phoneNumber) {
          await sendSMS(
            tenant.phoneNumber,
            'rentOverdue',
            property.title,
            financials.rentAmount
          );
        }

        agreement.auditLog.push({
          action: 'OVERDUE_NOTICE_SENT',
          timestamp: new Date(),
          details: 'Overdue rent notice sent to tenant.',
        });
        await agreement.save();
        break;
      }

      case 'AGREEMENT_EXPIRY_WARNING': {
        const { agreementId } = data;

        const agreement = await Agreement.findById(agreementId)
          .populate('tenant', 'name email phoneNumber smsOptIn')
          .populate('landlord', 'name email phoneNumber smsOptIn')
          .populate('property', 'title');

        if (!agreement) return;

        const expiryDate = new Date(agreement.term.endDate).toDateString();

        // Notify tenant
        await sendEmail(
          agreement.tenant.email,
          'expiryWarning',
          agreement.tenant.name,
          agreement.property.title,
          expiryDate,
          'tenant'
        );
        if (agreement.tenant.smsOptIn && agreement.tenant.phoneNumber) {
          await sendSMS(
            agreement.tenant.phoneNumber,
            'expiryWarning',
            agreement.property.title,
            expiryDate
          );
        }

        // Notify landlord
        await sendEmail(
          agreement.landlord.email,
          'expiryWarning',
          agreement.landlord.name,
          agreement.property.title,
          expiryDate,
          'landlord'
        );
        if (agreement.landlord.smsOptIn && agreement.landlord.phoneNumber) {
          await sendSMS(
            agreement.landlord.phoneNumber,
            'expiryWarning',
            agreement.property.title,
            expiryDate
          );
        }
        break;
      }

      case 'APPLICATION_ACCEPTED': {
        const { tenantEmail, tenantPhone, tenantName, propertyTitle, tenantSmsOptIn } = data;

        await sendEmail(tenantEmail, 'applicationAccepted', tenantName, propertyTitle);

        if (tenantSmsOptIn && tenantPhone) {
          await sendSMS(tenantPhone, 'applicationAccepted', propertyTitle);
        }
        break;
      }

      case 'APPLICATION_REJECTED': {
        const { tenantEmail, tenantPhone, tenantName, propertyTitle, tenantSmsOptIn } = data;

        await sendEmail(tenantEmail, 'applicationRejected', tenantName, propertyTitle);

        if (tenantSmsOptIn && tenantPhone) {
          await sendSMS(tenantPhone, 'applicationRejected', propertyTitle);
        }
        break;
      }

      case 'MAINTENANCE_UPDATE': {
        const { tenantEmail, tenantPhone, tenantName, requestTitle, newStatus, tenantSmsOptIn } = data;

        if (tenantSmsOptIn && tenantPhone) {
          await sendSMS(tenantPhone, 'maintenanceUpdate', requestTitle, newStatus);
        }
        // Email for maintenance updates can be added to emailService templates later
        break;
      }

      default:
        console.warn(`Unknown job type: ${type}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// ─── Worker event listeners ───────────────────────────────────────────────────
notificationWorker.on('completed', (job) => {
  console.log(`✅ Job completed [${job.data.type}] - ID: ${job.id}`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed [${job.data.type}] - ID: ${job.id} - Error: ${err.message}`);
});

module.exports = notificationWorker;