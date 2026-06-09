const express = require('express');
const { body, query } = require('express-validator');
const Event = require('../models/Event');
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Optional auth middleware to check if user has a token
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (error) {
    // Ignore, keep req.user undefined
  }
  next();
};

// GET /api/events - List events with search, filter, pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      location,
      dateFrom,
      dateTo,
      status,
      my,
      sort = '-date'
    } = req.query;

    const filter = {};

    // Only show approved events to public / regular users unless they view their own
    if (!req.user || req.user.role !== 'admin') {
      if (my === 'true' && req.user) {
        filter.createdBy = req.user._id;
      } else {
        filter.status = 'approved';
      }
    } else if (status) {
      filter.status = status;
    }

    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }

    // Location filter
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .populate('category', 'name slug icon color')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        events,
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

// GET /api/events/upcoming - Get upcoming events
router.get('/upcoming', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const events = await Event.find({
      status: 'approved',
      date: { $gte: new Date() }
    })
      .populate('category', 'name slug icon color')
      .sort('date')
      .limit(limit);

    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:slug - Get event by slug
router.get('/:slug', async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug })
      .populate('category', 'name slug icon color')
      .populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/events - Create event (admin or registered user)
router.post('/', protect, upload.single('image'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  validate
], async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id,
      tags: req.body.tags ? (typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : req.body.tags) : []
    };

    // If user is not admin, status is strictly pending
    if (req.user.role !== 'admin') {
      eventData.status = 'pending';
    }

    if (req.body.lat && req.body.lng) {
      eventData.coordinates = {
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng)
      };
    }

    if (req.file) {
      eventData.image = `/uploads/${req.file.filename}`;
    }

    const event = await Event.create(eventData);

    // Update category event count
    await Category.findByIdAndUpdate(event.category, { $inc: { eventCount: 1 } });

    const populated = await Event.findById(event._id)
      .populate('category', 'name slug icon color')
      .populate('createdBy', 'name');

    // Send notification to the user
    const Notification = require('../models/Notification');
    await Notification.create({
      user: req.user._id,
      title: event.status === 'approved' ? 'Event Created' : 'Event Submitted',
      message: event.status === 'approved'
        ? `Your event "${event.title}" has been successfully created and is live!`
        : `Your event "${event.title}" has been submitted for review.`,
      type: 'system',
      relatedEvent: event._id
    });

    // If pending, notify all admins
    if (event.status === 'pending') {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: 'New Event Suggested',
          message: `"${event.title}" was suggested by ${req.user.name} and requires approval.`,
          type: 'system',
          relatedEvent: event._id
        });
      }
    }

    res.status(201).json({
      success: true,
      message: event.status === 'approved' ? 'Event created successfully' : 'Event submitted for review',
      data: { event: populated }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/events/:id - Update event (admin or owner)
router.put('/:id', protect, upload.single('image'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if admin or event creator
    if (req.user.role !== 'admin' && event.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this event.'
      });
    }

    const updates = { ...req.body };

    if (req.body.tags) {
      updates.tags = typeof req.body.tags === 'string'
        ? req.body.tags.split(',').map(t => t.trim())
        : req.body.tags;
    }

    if (req.body.lat && req.body.lng) {
      updates.coordinates = {
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng)
      };
    }

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    // If user is not admin, any edit forces it back to pending status
    if (req.user.role !== 'admin') {
      updates.status = 'pending';
    }

    // If category changed, update counts
    if (updates.category && updates.category !== event.category.toString()) {
      await Category.findByIdAndUpdate(event.category, { $inc: { eventCount: -1 } });
      await Category.findByIdAndUpdate(updates.category, { $inc: { eventCount: 1 } });
    }

    Object.assign(event, updates);
    await event.save();

    const populated = await Event.findById(event._id)
      .populate('category', 'name slug icon color')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event: populated }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/events/:id - Delete event (admin)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await Category.findByIdAndUpdate(event.category, { $inc: { eventCount: -1 } });
    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/events/:id/status - Update event status (admin)
router.put('/:id/status', protect, adminOnly, [
  body('status').isIn(['draft', 'pending', 'approved', 'cancelled']).withMessage('Invalid status'),
  validate
], async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const oldStatus = event.status;
    event.status = req.body.status;
    await event.save();

    const populated = await Event.findById(event._id).populate('category', 'name slug icon color');

    // Notify event creator if they exist
    if (event.createdBy) {
      const Notification = require('../models/Notification');
      let notifTitle = '';
      let notifMessage = '';

      if (req.body.status === 'approved' && oldStatus !== 'approved') {
        notifTitle = 'Event Approved! 🎉';
        notifMessage = `Your suggested event "${event.title}" has been approved and is now live!`;
      } else if (req.body.status === 'cancelled' && oldStatus !== 'cancelled') {
        notifTitle = 'Event Cancelled';
        notifMessage = `Your suggested event "${event.title}" has been cancelled.`;
      }

      if (notifTitle && notifMessage) {
        await Notification.create({
          user: event.createdBy,
          title: notifTitle,
          message: notifMessage,
          type: 'event_update',
          relatedEvent: event._id
        });
      }
    }

    res.json({
      success: true,
      message: `Event status updated to ${req.body.status} successfully`,
      data: { event: populated }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/stats - Get public counts
router.get('/stats', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const [eventCount, userCount, uniqueLocations] = await Promise.all([
      Event.countDocuments({ status: 'approved' }),
      User.countDocuments(),
      Event.distinct('location', { status: 'approved' })
    ]);
    res.json({
      success: true,
      data: {
        events: eventCount,
        users: userCount,
        regions: Math.max(14, uniqueLocations.length)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
