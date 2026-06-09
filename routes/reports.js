const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/dashboard - Dashboard statistics
router.get('/dashboard', protect, adminOnly, async (req, res, next) => {
  try {
    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      cancelledEvents,
      totalUsers,
      totalRegistrations,
      totalCategories
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'cancelled' }),
      User.countDocuments({ role: 'user' }),
      Registration.countDocuments({ status: { $ne: 'cancelled' } }),
      Category.countDocuments()
    ]);

    // Recent registrations
    const recentRegistrations = await Registration.find()
      .populate('user', 'name email')
      .populate('event', 'title date')
      .sort('-registeredAt')
      .limit(10);

    // Upcoming events
    const upcomingEvents = await Event.find({
      status: 'approved',
      date: { $gte: new Date() }
    })
      .populate('category', 'name icon color')
      .sort('date')
      .limit(5);

    // Registrations by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrationsByMonth = await Registration.aggregate([
      {
        $match: {
          registeredAt: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$registeredAt' },
            month: { $month: '$registeredAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Events by category
    const eventsByCategory = await Event.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          name: '$category.name',
          color: '$category.color',
          icon: '$category.icon',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalEvents,
          approvedEvents,
          pendingEvents,
          cancelledEvents,
          totalUsers,
          totalRegistrations,
          totalCategories
        },
        recentRegistrations,
        upcomingEvents,
        registrationsByMonth,
        eventsByCategory
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/events - Event analytics
router.get('/events', protect, adminOnly, async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('category', 'name icon color')
      .sort('-registrationCount')
      .limit(20);

    // Top events by registration
    const topEvents = events.map(e => ({
      _id: e._id,
      title: e.title,
      date: e.date,
      category: e.category,
      registrationCount: e.registrationCount,
      capacity: e.capacity,
      status: e.status,
      fillRate: e.capacity > 0 ? Math.round((e.registrationCount / e.capacity) * 100) : 0
    }));

    res.json({
      success: true,
      data: { topEvents }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/registrations - Registration report
router.get('/registrations', protect, adminOnly, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = { status: { $ne: 'cancelled' } };

    if (dateFrom || dateTo) {
      filter.registeredAt = {};
      if (dateFrom) filter.registeredAt.$gte = new Date(dateFrom);
      if (dateTo) filter.registeredAt.$lte = new Date(dateTo);
    }

    const registrations = await Registration.find(filter)
      .populate('user', 'name email phone')
      .populate('event', 'title date location category')
      .sort('-registeredAt');

    const totalCount = registrations.length;
    const attendedCount = registrations.filter(r => r.status === 'attended').length;

    res.json({
      success: true,
      data: {
        registrations,
        summary: {
          total: totalCount,
          attended: attendedCount,
          attendanceRate: totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/export/:eventId - Export event attendees as CSV
router.get('/export/:eventId', protect, adminOnly, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
      status: { $ne: 'cancelled' }
    }).populate('user', 'name email phone');

    // Generate CSV
    const csvHeader = 'Name,Email,Phone,Status,Registered At\n';
    const csvRows = registrations.map(r =>
      `"${r.user.name}","${r.user.email}","${r.user.phone || ''}","${r.status}","${r.registeredAt.toISOString()}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendees-${event.slug}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
