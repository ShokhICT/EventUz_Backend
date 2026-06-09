const express = require('express');
const { body } = require('express-validator');
const Category = require('../models/Category');
const Event = require('../models/Event');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/categories - List all categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort('name');
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/:slug - Get category with its events
router.get('/:slug', async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const events = await Event.find({
      category: category._id,
      status: 'approved'
    })
      .populate('category', 'name slug icon color')
      .sort('-date')
      .limit(20);

    res.json({
      success: true,
      data: { category, events }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories - Create category (admin)
router.post('/', protect, adminOnly, [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  validate
], async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;
    const category = await Category.create({ name, description, icon, color });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id - Update category (admin)
router.put('/:id', protect, adminOnly, [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  validate
], async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon) updates.icon = icon;
    if (color) updates.color = color;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    Object.assign(category, updates);
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id - Delete category (admin)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has events
    const eventCount = await Event.countDocuments({ category: category._id });
    if (eventCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${eventCount} events. Reassign or delete events first.`
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
