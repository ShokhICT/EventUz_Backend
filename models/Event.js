const mongoose = require('mongoose');
const slugify = require('slugify');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  image: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  endDate: {
    type: Date
  },
  time: {
    type: String
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  address: {
    type: String
  },
  organizer: {
    type: String
  },
  capacity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  tags: [{
    type: String,
    trim: true
  }],
  registrationCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, {
  timestamps: true
});

// Generate slug before saving
eventSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  if (this.price === 0) {
    this.isFree = true;
  } else {
    this.isFree = false;
  }
  next();
});

// Indexes for search and filtering
eventSchema.index({ title: 'text', description: 'text', location: 'text' });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
