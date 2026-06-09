const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const categoryRoutes = require('./routes/categories');
const registrationRoutes = require('./routes/registrations');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');

const app = express();

// Middleware
const allowedOrigins = [
  'https://eventhub.uz',
  'https://eventuz.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map(url => url.trim()));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  let mongoUri = process.env.MONGODB_URI;

  // Try connecting to local MongoDB first, if it fails use memory server
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.log('⚠️  Local MongoDB not available, starting in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to in-memory MongoDB');

      // Auto-seed the in-memory database
      console.log('🌱 Seeding database...');
      await runSeed();
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 EventHub API running on port ${PORT}`);
  });
};

// Inline seed function for in-memory DB
const runSeed = async () => {
  const User = require('./models/User');
  const Category = require('./models/Category');
  const Event = require('./models/Event');
  const Registration = require('./models/Registration');
  const Notification = require('./models/Notification');

  const cats = [
    { name: 'Technology', description: 'IT conferences, hackathons, and tech meetups', icon: '💻', color: '#6366f1' },
    { name: 'Education', description: 'Workshops, seminars, and training sessions', icon: '📚', color: '#0891b2' },
    { name: 'Business', description: 'Networking events, startup pitches, and conferences', icon: '💼', color: '#059669' },
    { name: 'Culture', description: 'Art exhibitions, theater, and cultural festivals', icon: '🎭', color: '#d946ef' },
    { name: 'Sports', description: 'Tournaments, marathons, and fitness events', icon: '⚽', color: '#f59e0b' },
    { name: 'Music', description: 'Concerts, festivals, and music workshops', icon: '🎵', color: '#ef4444' },
    { name: 'Community', description: 'Volunteer events, charity, and social gatherings', icon: '🤝', color: '#8b5cf6' },
    { name: 'Health', description: 'Wellness workshops, medical seminars, and health fairs', icon: '🏥', color: '#10b981' }
  ];

  const admin = await User.create({ name: 'Admin User', email: 'admin@eventhub.uz', password: 'admin123', role: 'admin', phone: '+998901234567', bio: 'Platform Administrator' });
  const user1 = await User.create({ name: 'Aziz Karimov', email: 'aziz@example.com', password: 'user123', role: 'user', phone: '+998901112233' });
  const user2 = await User.create({ name: 'Dilnoza Rashidova', email: 'dilnoza@example.com', password: 'user123', role: 'user', phone: '+998902223344' });

  const createdCats = await Category.create(cats);
  const catMap = {};
  createdCats.forEach(c => { catMap[c.name] = c._id; });

  const now = new Date();
  const events = [
    { title: 'Tashkent Tech Summit 2026', description: 'The largest technology conference in Central Asia featuring keynote speakers from global tech companies. Join industry leaders for innovation and networking.', shortDescription: 'Central Asia\'s premier technology conference.', category: catMap['Technology'], date: new Date(now.getTime() + 14*86400000), time: '09:00', location: 'Tashkent', address: 'IT Park, Mirzo Ulugbek', organizer: 'IT Park Uzbekistan', capacity: 500, status: 'approved', tags: ['technology', 'AI', 'startup'], createdBy: admin._id, coordinates: { lat: 41.3385, lng: 69.3402 } },
    { title: 'Digital Marketing Masterclass', description: 'Learn the latest digital marketing strategies from industry experts. Covers SEO, social media, content strategy.', shortDescription: 'Intensive digital marketing workshop.', category: catMap['Business'], date: new Date(now.getTime() + 7*86400000), time: '10:00', location: 'Tashkent', address: 'Hilton Tashkent City', organizer: 'Digital Academy', capacity: 100, price: 50000, status: 'approved', tags: ['marketing', 'business'], createdBy: admin._id, coordinates: { lat: 41.3120, lng: 69.2505 } },
    { title: 'Uzbek Classical Music Festival', description: 'Experience the rich musical heritage of Uzbekistan featuring traditional shashmaqom and classical dutar performances.', shortDescription: 'Festival celebrating Uzbekistan\'s musical heritage.', category: catMap['Music'], date: new Date(now.getTime() + 21*86400000), time: '18:00', location: 'Samarkand', address: 'Registan Square', organizer: 'Ministry of Culture', capacity: 2000, price: 30000, status: 'approved', tags: ['music', 'culture'], createdBy: admin._id, coordinates: { lat: 39.6548, lng: 66.9757 } },
    { title: 'Youth Football Championship', description: 'Annual youth football championship bringing together teams from all regions of Uzbekistan.', shortDescription: 'Regional youth football tournament.', category: catMap['Sports'], date: new Date(now.getTime() + 10*86400000), time: '08:00', location: 'Bukhara', address: 'Central Stadium', organizer: 'Football Association', capacity: 5000, status: 'approved', tags: ['football', 'sports'], createdBy: admin._id, coordinates: { lat: 39.7667, lng: 64.4402 } },
    { title: 'Python Programming Bootcamp', description: 'Intensive 3-day Python bootcamp for beginners and intermediate developers. Learn fundamentals, Django, and Pandas.', shortDescription: 'Three-day intensive Python bootcamp.', category: catMap['Education'], date: new Date(now.getTime() + 5*86400000), time: '09:00', location: 'Tashkent', address: 'Najot Ta\'lim', organizer: 'Najot Ta\'lim', capacity: 50, price: 200000, status: 'approved', tags: ['python', 'programming'], createdBy: admin._id, coordinates: { lat: 41.2785, lng: 69.2152 } },
    { title: 'Silk Road Art Exhibition', description: 'A stunning exhibition showcasing contemporary and traditional art from along the historic Silk Road.', shortDescription: 'Contemporary art exhibition celebrating Silk Road heritage.', category: catMap['Culture'], date: new Date(now.getTime() + 3*86400000), time: '10:00', location: 'Tashkent', address: 'State Art Museum', organizer: 'State Art Museum', capacity: 200, price: 15000, status: 'approved', tags: ['art', 'exhibition'], createdBy: admin._id, coordinates: { lat: 41.3023, lng: 69.2742 } },
    { title: 'Community Clean-up Day', description: 'Join fellow citizens in making Tashkent greener! Cleaning parks, planting trees. Supplies provided.', shortDescription: 'Volunteer park cleaning event.', category: catMap['Community'], date: new Date(now.getTime() + 8*86400000), time: '07:00', location: 'Tashkent', address: 'Navruz Park', organizer: 'Green Uzbekistan NGO', capacity: 300, status: 'approved', tags: ['volunteer', 'community'], createdBy: admin._id, coordinates: { lat: 41.3262, lng: 69.2678 } },
    { title: 'Wellness & Yoga Retreat', description: 'Weekend retreat focused on mental and physical wellness. Yoga, meditation, healthy cooking, nature walks.', shortDescription: 'Weekend wellness retreat in Chimgan mountains.', category: catMap['Health'], date: new Date(now.getTime() + 18*86400000), time: '06:00', location: 'Chimgan', address: 'Chimgan Resort', organizer: 'Wellness Uzbekistan', capacity: 40, price: 500000, status: 'approved', tags: ['yoga', 'wellness'], createdBy: admin._id, coordinates: { lat: 41.5179, lng: 70.0539 } },
    { title: 'Startup Pitch Night', description: 'The hottest startup pitch event! 10 selected startups present to investors. Networking dinner included.', shortDescription: 'Startup pitch competition with investors.', category: catMap['Business'], date: new Date(now.getTime() + 12*86400000), time: '18:00', location: 'Tashkent', address: 'Ground Zero Coworking', organizer: 'Startup Uzbekistan', capacity: 150, status: 'approved', tags: ['startup', 'pitch'], createdBy: admin._id, coordinates: { lat: 41.2995, lng: 69.2731 } },
    { title: 'Hackathon: Smart Cities', description: '48-hour hackathon focused on smart city solutions for Uzbekistan. Prize pool: 50M UZS.', shortDescription: '48-hour smart city hackathon with prizes.', category: catMap['Technology'], date: new Date(now.getTime() + 25*86400000), time: '10:00', location: 'Tashkent', address: 'IT Park Innovation Center', organizer: 'IT Park & UNDP', capacity: 200, status: 'approved', tags: ['hackathon', 'innovation'], createdBy: admin._id, coordinates: { lat: 41.3385, lng: 69.3402 } },
    { title: 'English Language Workshop', description: 'Free English workshop for intermediate learners. Business communication and academic writing.', shortDescription: 'Free English business communication workshop.', category: catMap['Education'], date: new Date(now.getTime() + 4*86400000), time: '14:00', location: 'Tashkent', address: 'British Council', organizer: 'British Council', capacity: 30, status: 'approved', tags: ['english', 'language'], createdBy: admin._id, coordinates: { lat: 41.3148, lng: 69.2562 } },
    { title: 'Navruz Festival Celebration', description: 'Celebrate Navruz with traditional food, music, dancing! Activities for the whole family.', shortDescription: 'Grand Navruz spring celebration.', category: catMap['Culture'], date: new Date(now.getTime() + 30*86400000), time: '10:00', location: 'Tashkent', address: 'Humo Arena', organizer: 'City Administration', capacity: 10000, status: 'pending', tags: ['navruz', 'festival'], createdBy: admin._id, coordinates: { lat: 41.3024, lng: 69.2452 } }
  ];

  const createdEvents = await Event.create(events);

  for (const c of createdCats) {
    const count = await Event.countDocuments({ category: c._id, status: 'approved' });
    c.eventCount = count;
    await c.save();
  }

  await Registration.create([
    { user: user1._id, event: createdEvents[0]._id },
    { user: user1._id, event: createdEvents[4]._id },
    { user: user2._id, event: createdEvents[0]._id },
    { user: user2._id, event: createdEvents[2]._id },
    { user: user2._id, event: createdEvents[6]._id },
  ]);

  await Event.findByIdAndUpdate(createdEvents[0]._id, { registrationCount: 2 });
  await Event.findByIdAndUpdate(createdEvents[2]._id, { registrationCount: 1 });
  await Event.findByIdAndUpdate(createdEvents[4]._id, { registrationCount: 1 });
  await Event.findByIdAndUpdate(createdEvents[6]._id, { registrationCount: 1 });

  await Notification.create([
    { user: user1._id, title: 'Registration Confirmed', message: 'You registered for "Tashkent Tech Summit 2026"', type: 'registration', relatedEvent: createdEvents[0]._id },
    { user: user1._id, title: 'Welcome to EventHub!', message: 'Discover exciting events near you.', type: 'system' },
  ]);

  console.log('✅ Database seeded (3 users, 8 categories, 12 events)');
};

startServer();

module.exports = app;
