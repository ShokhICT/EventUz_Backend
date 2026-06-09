const express = require('express');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/registrations - Register for an event
router.post('/', protect, async (req, res, next) => {
  try {
    const { eventId, notes } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This event is not accepting registrations'
      });
    }

    // Check capacity
    if (event.capacity > 0 && event.registrationCount >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Event has reached maximum capacity'
      });
    }

    // Check if already registered
    const existing = await Registration.findOne({
      user: req.user._id,
      event: eventId,
      status: { $ne: 'cancelled' }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    const registration = await Registration.create({
      user: req.user._id,
      event: eventId,
      notes
    });

    // Update event registration count
    await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: 1 } });

    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Registration Confirmed',
      message: `You have successfully registered for "${event.title}"`,
      type: 'registration',
      relatedEvent: eventId
    });

    const populated = await Registration.findById(registration._id)
      .populate('event', 'title slug date location image')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for the event',
      data: { registration: populated }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }
    next(error);
  }
});

// GET /api/registrations/my - Get current user's registrations
router.get('/my', protect, async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate({
        path: 'event',
        select: 'title slug date endDate location image status category',
        populate: { path: 'category', select: 'name icon color' }
      })
      .sort('-registeredAt');

    res.json({
      success: true,
      data: { registrations }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/registrations/:id - Cancel registration
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    registration.status = 'cancelled';
    await registration.save();

    // Decrement registration count
    await Event.findByIdAndUpdate(registration.event, { $inc: { registrationCount: -1 } });

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/registrations/event/:eventId - Get event attendees (admin)
router.get('/event/:eventId', protect, adminOnly, async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      event: req.params.eventId,
      status: { $ne: 'cancelled' }
    })
      .populate('user', 'name email phone')
      .sort('-registeredAt');

    res.json({
      success: true,
      data: { registrations }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/registrations/:id/status - Update registration status (admin)
router.put('/:id/status', protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['confirmed', 'cancelled', 'attended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const oldStatus = registration.status;
    registration.status = status;
    await registration.save();

    // Update registration count if status changed to/from cancelled
    if (oldStatus !== 'cancelled' && status === 'cancelled') {
      await Event.findByIdAndUpdate(registration.event, { $inc: { registrationCount: -1 } });
    } else if (oldStatus === 'cancelled' && status !== 'cancelled') {
      await Event.findByIdAndUpdate(registration.event, { $inc: { registrationCount: 1 } });
    }

    res.json({
      success: true,
      message: 'Registration status updated',
      data: { registration }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/registrations - All registrations (admin)
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, event, status } = req.query;
    const filter = {};

    if (event) filter.event = event;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Registration.countDocuments(filter);

    const registrations = await Registration.find(filter)
      .populate('user', 'name email phone')
      .populate('event', 'title slug date')
      .sort('-registeredAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        registrations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
