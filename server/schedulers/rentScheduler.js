const cron = require('node-cron');
const Agreement = require('../models/Agreement');
const notificationQueue = require('../queues/notificationQueue');

const startRentScheduler = () => {

  // ─── Daily 8AM: Rent Reminders + Expiry Warnings ─────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily rent reminder check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeAgreements = await Agreement.find({ status: 'active' });

      for (const agreement of activeAgreements) {
        const startDate = new Date(agreement.term.startDate);

        // Calculate next due date (same day-of-month as lease start)
        const nextDueDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          startDate.getDate()
        );

        if (nextDueDate < today) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const daysUntilDue = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

        // 3-day advance reminder
        if (daysUntilDue === 3) {
          await notificationQueue.add(
            `rent-reminder-${agreement._id}`,
            {
              type: 'RENT_DUE_REMINDER',
              data: {
                agreementId: agreement._id.toString(),
                dueDate: nextDueDate.toISOString(),
              },
            },
            { jobId: `rent-${agreement._id}-${nextDueDate.getMonth()}` }
          );
        }

        // 30-day lease expiry warning
        const endDate = new Date(agreement.term.endDate);
        const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry === 30) {
          await notificationQueue.add(
            `expiry-warning-${agreement._id}`,
            {
              type: 'AGREEMENT_EXPIRY_WARNING',
              data: { agreementId: agreement._id.toString() },
            },
            { jobId: `expiry-${agreement._id}` }
          );
        }
      }
    } catch (error) {
      console.error('Scheduler error (reminders):', error.message);
    }
  });

  // ─── Daily 9AM: Auto Late Fee Application ────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('💸 Running daily late fee check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active agreements that have a rent schedule
      const activeAgreements = await Agreement.find({
        status: 'active',
        'rentSchedule.0': { $exists: true },
      }).populate('tenant', 'name email phoneNumber smsOptIn');

      let feeCount = 0;

      for (const agreement of activeAgreements) {
        let modified = false;
        const gracePeriodDays = agreement.financials.lateFeeGracePeriodDays || 5;
        const lateFeeAmount = agreement.financials.lateFeeAmount || 0;

        if (lateFeeAmount === 0) continue; // Skip if no late fee configured

        for (const entry of agreement.rentSchedule) {
          if (entry.status !== 'pending') continue;

          const dueDate = new Date(entry.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

          // Mark as overdue as soon as it's past due date
          if (daysPastDue > 0 && entry.status === 'pending') {
            entry.status = 'overdue';
            modified = true;

            // Queue overdue notification
            await notificationQueue.add(
              `overdue-${agreement._id}-${entry.dueDate}`,
              {
                type: 'RENT_OVERDUE',
                data: { agreementId: agreement._id.toString() },
              },
              { jobId: `overdue-${agreement._id}-${dueDate.getMonth()}` }
            );
          }

          // Apply late fee after grace period
          if (
            daysPastDue > gracePeriodDays &&
            entry.status === 'overdue' &&
            !entry.lateFeeApplied
          ) {
            entry.lateFeeApplied = true;
            entry.lateFeeAmount = lateFeeAmount;
            entry.status = 'late_fee_applied';
            entry.amount = entry.amount + lateFeeAmount; // Total now includes late fee
            modified = true;
            feeCount++;

            // Log in audit trail
            agreement.auditLog.push({
              action: 'LATE_FEE_APPLIED',
              timestamp: new Date(),
              details: `Late fee of Rs. ${lateFeeAmount} applied to ${entry.dueDate} rent entry. ${daysPastDue} days past due.`,
            });

            console.log(`💸 Late fee applied for agreement ${agreement._id}, due ${entry.dueDate}`);
          }
        }

        if (modified) {
          await agreement.save();
        }
      }

      console.log(`✅ Late fee check complete. ${feeCount} fees applied.`);
    } catch (error) {
      console.error('Scheduler error (late fees):', error.message);
    }
  });

  // ─── Daily Midnight: Expire ended leases ─────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Checking for expired leases...');
    try {
      const today = new Date();

      const result = await Agreement.updateMany(
        {
          status: 'active',
          'term.endDate': { $lt: today },
        },
        {
          status: 'expired',
          $push: {
            auditLog: {
              action: 'AUTO_EXPIRED',
              timestamp: new Date(),
              details: 'Lease automatically marked as expired by scheduler.',
            },
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${result.modifiedCount} lease(s) marked as expired.`);
      }
    } catch (error) {
      console.error('Scheduler error (expiry):', error.message);
    }
  });

  console.log('✅ Rent scheduler started (reminders @8AM, late fees @9AM, expiry @midnight)');
};

module.exports = { startRentScheduler };