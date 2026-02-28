const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Agreement = require('../models/Agreement');
const Payment = require('../models/Payment');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

// @desc    Create Stripe Checkout Session for Deposit + 1st Month Rent
// @route   POST /api/payments/create-checkout-session
// @access  Private (Tenant)
const createCheckoutSession = async (req, res) => {
  try {
    const { agreementId } = req.body;
    const agreement = await Agreement.findById(agreementId)
      .populate('property', 'title')
      .populate('tenant', 'name email')
      .populate('landlord', 'name');

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Only the tenant on this agreement can pay
    if (agreement.tenant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay for this agreement' });
    }

    if (agreement.isPaid) {
      return res.status(400).json({ message: 'Initial payment has already been made' });
    }

    if (agreement.status !== 'signed') {
      return res.status(400).json({ message: 'Agreement must be fully signed before payment' });
    }

    const rentAmount = agreement.financials.rentAmount || 0;
    const depositAmount = agreement.financials.depositAmount || 0;
    const totalAmount = rentAmount + depositAmount;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'pkr',
            product_data: {
              name: `Security Deposit + 1st Month Rent`,
              description: `Property: ${agreement.property.title}`,
            },
            unit_amount: totalAmount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/dashboard/my-lease?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/my-lease?canceled=true`,
      metadata: { agreementId: agreement._id.toString() },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle Stripe Webhooks
// @route   POST /api/payments/webhook
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { agreementId } = session.metadata;

    const agreement = await Agreement.findById(agreementId)
      .populate('tenant', 'name email phoneNumber smsOptIn')
      .populate('landlord', 'name email')
      .populate('property', 'title');

    if (!agreement) {
      console.error(`Webhook: Agreement ${agreementId} not found`);
      return res.json({ received: true });
    }

    // Generate full rent schedule
    const schedule = [];
    const startDate = new Date(agreement.term.startDate);
    const duration = agreement.term.durationMonths || 12;

    for (let i = 0; i < duration; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);

      schedule.push({
        dueDate,
        amount: agreement.financials.rentAmount,
        status: i === 0 ? 'paid' : 'pending',
        paidDate: i === 0 ? new Date() : null,
        paidAmount: i === 0 ? agreement.financials.rentAmount : null,
        lateFeeApplied: false,
        lateFeeAmount: 0,
        stripePaymentIntent: i === 0 ? session.payment_intent : null,
      });
    }

    // Save a standalone Payment record for this initial payment
    await Payment.create({
      agreement: agreementId,
      tenant: agreement.tenant._id,
      landlord: agreement.landlord._id,
      property: agreement.property._id,
      amount: session.amount_total / 100,
      type: 'initial',
      status: 'paid',
      paidAt: new Date(),
      dueDate: startDate,
      stripePaymentIntent: session.payment_intent,
      stripeSessionId: session.id,
    });

    // Activate the agreement
    await Agreement.findByIdAndUpdate(agreementId, {
      status: 'active',
      isPaid: true,
      rentSchedule: schedule,
      $push: {
        paymentHistory: {
          amount: session.amount_total / 100,
          status: 'paid',
          stripePaymentIntent: session.payment_intent,
        },
        auditLog: {
          action: 'LEASE_ACTIVATED',
          timestamp: new Date(),
          details: 'Security deposit and 1st month rent paid. Lease activated and schedule generated.',
        },
      },
    });

    // Mark property as occupied and unlist it
    if (agreement.property?._id) {
      await require('../models/Property').findByIdAndUpdate(agreement.property._id, {
        status: 'occupied',
        isListed: false,
      });
    }

    // Notify tenant via email + SMS
    sendEmail(
      agreement.tenant.email,
      'paymentConfirmed',
      agreement.tenant.name,
      agreement.property.title,
      session.amount_total / 100
    );

    if (agreement.tenant.smsOptIn && agreement.tenant.phoneNumber) {
      sendSMS(
        agreement.tenant.phoneNumber,
        'rentDueReminder', // Reuse closest template
        agreement.property.title,
        agreement.financials.rentAmount,
        new Date()
      );
    }

    console.log(`💰 Payment confirmed & Lease ACTIVATED: ${agreementId}`);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.error(`❌ Payment failed: ${paymentIntent.id}`);
    // TODO: Notify tenant of failed payment and prompt retry
  }

  res.json({ received: true });
};

// @desc    Get rent schedule for an agreement
// @route   GET /api/payments/schedule/:agreementId
// @access  Private (Tenant or Landlord on this agreement)
const getRentSchedule = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.agreementId)
      .populate('property', 'title address')
      .populate('tenant', 'name')
      .populate('landlord', 'name');

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const userId = req.user._id.toString();
    const isTenant = agreement.tenant._id.toString() === userId;
    const isLandlord = agreement.landlord._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTenant && !isLandlord && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Compute summary stats
    const schedule = agreement.rentSchedule || [];
    const paid = schedule.filter(e => e.status === 'paid').length;
    const overdue = schedule.filter(e => e.status === 'overdue' || e.status === 'late_fee_applied').length;
    const pending = schedule.filter(e => e.status === 'pending').length;

    const totalLateFees = schedule.reduce((sum, e) => sum + (e.lateFeeAmount || 0), 0);

    res.json({
      agreement: {
        _id: agreement._id,
        property: agreement.property,
        tenant: agreement.tenant,
        landlord: agreement.landlord,
        term: agreement.term,
        financials: agreement.financials,
        status: agreement.status,
      },
      schedule,
      summary: {
        total: schedule.length,
        paid,
        pending,
        overdue,
        totalLateFees,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private (Tenant sees own | Landlord sees incoming | Admin sees all)
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const filter = {};

    if (req.user.role === 'tenant') {
      filter.tenant = req.user._id;
    } else if (req.user.role === 'landlord') {
      filter.landlord = req.user._id;
    } else if (req.user.role === 'property_manager') {
      // PM sees payments for their managed properties
      const managedProperties = await require('../models/Property')
        .find({ managedBy: req.user._id })
        .select('_id');
      filter.property = { $in: managedProperties.map(p => p._id) };
    }
    // Admin sees all — no filter

    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('tenant', 'name email')
        .populate('landlord', 'name')
        .populate('property', 'title address')
        .sort('-paidAt')
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      payments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
  getRentSchedule,
  getPaymentHistory,
};