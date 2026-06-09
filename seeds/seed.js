const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');

const categories = [
  { name: 'Technology', description: 'IT conferences, hackathons, and tech meetups', icon: '💻', color: '#6366f1' },
  { name: 'Education', description: 'Workshops, seminars, and training sessions', icon: '📚', color: '#0891b2' },
  { name: 'Business', description: 'Networking events, startup pitches, and conferences', icon: '💼', color: '#059669' },
  { name: 'Culture', description: 'Art exhibitions, theater, and cultural festivals', icon: '🎭', color: '#d946ef' },
  { name: 'Sports', description: 'Tournaments, marathons, and fitness events', icon: '⚽', color: '#f59e0b' },
  { name: 'Music', description: 'Concerts, festivals, and music workshops', icon: '🎵', color: '#ef4444' },
  { name: 'Community', description: 'Volunteer events, charity, and social gatherings', icon: '🤝', color: '#8b5cf6' },
  { name: 'Health', description: 'Wellness workshops, medical seminars, and health fairs', icon: '🏥', color: '#10b981' }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Notification.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@eventhub.uz',
      password: 'admin123',
      role: 'admin',
      phone: '+998901234567',
      bio: 'EventHub Uzbekistan Platform Administrator'
    });

    const user1 = await User.create({
      name: 'Aziz Karimov',
      email: 'aziz@example.com',
      password: 'user123',
      role: 'user',
      phone: '+998901112233',
      bio: 'Software developer passionate about tech events'
    });

    const user2 = await User.create({
      name: 'Dilnoza Rashidova',
      email: 'dilnoza@example.com',
      password: 'user123',
      role: 'user',
      phone: '+998902223344',
      bio: 'Event enthusiast and community organizer'
    });

    console.log('✅ Users created');

    // Create categories
    const createdCategories = await Category.create(categories);
    const catMap = {};
    createdCategories.forEach(c => { catMap[c.name] = c._id; });
    console.log('✅ Categories created');

    // Create events
    const now = new Date();
    const events = [
      {
        title: 'Tashkent Tech Summit 2026',
        description: 'The largest technology conference in Central Asia featuring keynote speakers from global tech companies. Join industry leaders, developers, and entrepreneurs for three days of innovation, networking, and hands-on workshops.\n\nTopics include AI/ML, Cloud Computing, Blockchain, and Cybersecurity. Special startup pitch competition with prizes worth $10,000.',
        shortDescription: 'Central Asia\'s premier technology conference with world-class speakers and workshops.',
        category: catMap['Technology'],
        date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        time: '09:00',
        location: 'Tashkent',
        address: 'Tashkent IT Park, Mirzo Ulugbek District',
        organizer: 'IT Park Uzbekistan',
        capacity: 500,
        price: 0,
        status: 'approved',
        tags: ['technology', 'AI', 'startup', 'networking'],
        createdBy: admin._id,
        coordinates: { lat: 41.3385, lng: 69.3402 }
      },
      {
        title: 'Digital Marketing Masterclass',
        description: 'Learn the latest digital marketing strategies from industry experts. This intensive one-day masterclass covers SEO, social media marketing, content strategy, and analytics.\n\nPerfect for business owners, marketing professionals, and students looking to upgrade their digital skills.',
        shortDescription: 'Intensive digital marketing workshop covering SEO, social media, and analytics.',
        category: catMap['Business'],
        date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        time: '10:00',
        location: 'Tashkent',
        address: 'Hilton Tashkent City, Shaykhantahur District',
        organizer: 'Digital Uzbekistan Academy',
        capacity: 100,
        price: 50000,
        status: 'approved',
        tags: ['marketing', 'digital', 'business', 'SEO'],
        createdBy: admin._id,
        coordinates: { lat: 41.3120, lng: 69.2505 }
      },
      {
        title: 'Uzbek Classical Music Festival',
        description: 'Experience the rich musical heritage of Uzbekistan in this three-day festival featuring traditional shashmaqom, classical dutar performances, and contemporary Uzbek music.\n\nFeaturing renowned musicians from across Uzbekistan and guest performers from neighboring countries.',
        shortDescription: 'Three-day festival celebrating Uzbekistan\'s rich musical heritage.',
        category: catMap['Music'],
        date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000),
        time: '18:00',
        location: 'Samarkand',
        address: 'Registan Square, Samarkand',
        organizer: 'Ministry of Culture',
        capacity: 2000,
        price: 30000,
        status: 'approved',
        tags: ['music', 'culture', 'festival', 'traditional'],
        createdBy: admin._id,
        coordinates: { lat: 39.6548, lng: 66.9757 }
      },
      {
        title: 'Youth Football Championship',
        description: 'Annual youth football championship bringing together teams from all 14 regions of Uzbekistan. Age groups: U-14, U-16, and U-18.\n\nJoin us to support young athletes and discover the future stars of Uzbekistan football.',
        shortDescription: 'Annual youth football tournament featuring teams from all regions.',
        category: catMap['Sports'],
        date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        time: '08:00',
        location: 'Bukhara',
        address: 'Bukhara Central Stadium',
        organizer: 'Uzbekistan Football Association',
        capacity: 5000,
        price: 0,
        status: 'approved',
        tags: ['football', 'sports', 'youth', 'championship'],
        createdBy: admin._id,
        coordinates: { lat: 39.7667, lng: 64.4402 }
      },
      {
        title: 'Python Programming Bootcamp',
        description: 'Intensive 3-day Python bootcamp for beginners and intermediate developers. Learn Python fundamentals, web development with Django, data analysis with Pandas, and automation scripting.\n\nIncludes hands-on projects, code review sessions, and certificate of completion.',
        shortDescription: 'Three-day intensive Python bootcamp with hands-on projects.',
        category: catMap['Education'],
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        time: '09:00',
        location: 'Tashkent',
        address: 'Najot Ta\'lim, Chilanzar District',
        organizer: 'Najot Ta\'lim',
        capacity: 50,
        price: 200000,
        status: 'approved',
        tags: ['python', 'programming', 'bootcamp', 'education'],
        createdBy: admin._id,
        coordinates: { lat: 41.2785, lng: 69.2152 }
      },
      {
        title: 'Silk Road Art Exhibition',
        description: 'A stunning exhibition showcasing contemporary and traditional art from along the historic Silk Road. Featuring works from artists across Central Asia, Iran, China, and Turkey.\n\nIncluding interactive installations, artist talks, and guided tours.',
        shortDescription: 'Contemporary and traditional art exhibition celebrating Silk Road heritage.',
        category: catMap['Culture'],
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        time: '10:00',
        location: 'Tashkent',
        address: 'State Art Museum of Uzbekistan, Amir Timur Square',
        organizer: 'State Art Museum',
        capacity: 200,
        price: 15000,
        status: 'approved',
        tags: ['art', 'exhibition', 'silk road', 'culture'],
        createdBy: admin._id,
        coordinates: { lat: 41.3023, lng: 69.2742 }
      },
      {
        title: 'Community Clean-up Day: Tashkent Parks',
        description: 'Join fellow citizens in making Tashkent greener and cleaner! We\'ll be cleaning up parks across the city, planting trees, and spreading environmental awareness.\n\nAll supplies provided. Families welcome!',
        shortDescription: 'Volunteer event to clean parks and plant trees across Tashkent.',
        category: catMap['Community'],
        date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        time: '07:00',
        location: 'Tashkent',
        address: 'Meeting point: Navruz Park, Tashkent',
        organizer: 'Green Uzbekistan NGO',
        capacity: 300,
        price: 0,
        status: 'approved',
        tags: ['volunteer', 'environment', 'community', 'cleanup'],
        createdBy: admin._id,
        coordinates: { lat: 41.3262, lng: 69.2678 }
      },
      {
        title: 'Wellness & Yoga Retreat',
        description: 'A weekend retreat focused on mental and physical wellness. Includes yoga sessions, meditation workshops, healthy cooking classes, and nature walks in the beautiful Chimgan mountains.\n\nExpert instructors, all meals included.',
        shortDescription: 'Weekend wellness retreat with yoga, meditation, and healthy living workshops.',
        category: catMap['Health'],
        date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000),
        time: '06:00',
        location: 'Chimgan',
        address: 'Chimgan Mountain Resort, Tashkent Region',
        organizer: 'Wellness Uzbekistan',
        capacity: 40,
        price: 500000,
        status: 'approved',
        tags: ['yoga', 'wellness', 'health', 'retreat'],
        createdBy: admin._id,
        coordinates: { lat: 41.5179, lng: 70.0539 }
      },
      {
        title: 'Startup Pitch Night Tashkent',
        description: 'The hottest startup pitch event in Uzbekistan! 10 selected startups present their ideas to a panel of investors and mentors. Networking dinner included.\n\nApply to pitch or attend as an audience member.',
        shortDescription: 'Startup pitch competition with investors and networking dinner.',
        category: catMap['Business'],
        date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        time: '18:00',
        location: 'Tashkent',
        address: 'Ground Zero Coworking, Mirabad District',
        organizer: 'Startup Uzbekistan',
        capacity: 150,
        price: 0,
        status: 'approved',
        tags: ['startup', 'pitch', 'investors', 'networking'],
        createdBy: admin._id,
        coordinates: { lat: 41.2995, lng: 69.2731 }
      },
      {
        title: 'Hackathon: Smart Cities Uzbekistan',
        description: 'A 48-hour hackathon focused on building smart city solutions for Uzbekistan. Challenges include transportation, energy efficiency, public safety, and civic engagement.\n\nPrize pool: 50,000,000 UZS. Teams of 3-5 members.',
        shortDescription: '48-hour hackathon building smart city solutions with $50M UZS prize pool.',
        category: catMap['Technology'],
        date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000),
        time: '10:00',
        location: 'Tashkent',
        address: 'IT Park Innovation Center',
        organizer: 'IT Park & UNDP',
        capacity: 200,
        price: 0,
        status: 'approved',
        tags: ['hackathon', 'smart city', 'innovation', 'coding'],
        createdBy: admin._id,
        coordinates: { lat: 41.3385, lng: 69.3402 }
      },
      {
        title: 'English Language Workshop',
        description: 'Free English language workshop for intermediate learners. Focus on business communication, presentation skills, and academic writing.\n\nNative English-speaking instructors from the British Council.',
        shortDescription: 'Free English workshop for business communication and academic writing.',
        category: catMap['Education'],
        date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        time: '14:00',
        location: 'Tashkent',
        address: 'British Council Uzbekistan, Shaykhantahur',
        organizer: 'British Council',
        capacity: 30,
        price: 0,
        status: 'approved',
        tags: ['english', 'language', 'workshop', 'free'],
        createdBy: admin._id,
        coordinates: { lat: 41.3148, lng: 69.2562 }
      },
      {
        title: 'Navruz Festival Celebration',
        description: 'Celebrate Navruz with traditional food, music, dancing, and cultural performances! Join the biggest spring celebration in Tashkent with activities for the whole family.\n\nFeatures sumalak cooking, kupkari demonstrations, and artisan marketplace.',
        shortDescription: 'Grand Navruz celebration with traditional food, music, and cultural events.',
        category: catMap['Culture'],
        date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        time: '10:00',
        location: 'Tashkent',
        address: 'Humo Arena Complex',
        organizer: 'Tashkent City Administration',
        capacity: 10000,
        price: 0,
        status: 'pending',
        tags: ['navruz', 'festival', 'culture', 'traditional'],
        createdBy: admin._id,
        coordinates: { lat: 41.3024, lng: 69.2452 }
      }
    ];

    const createdEvents = await Event.create(events);
    console.log(`✅ ${createdEvents.length} events created`);

    // Update category event counts
    for (const cat of createdCategories) {
      const count = await Event.countDocuments({ category: cat._id, status: 'approved' });
      cat.eventCount = count;
      await cat.save();
    }
    console.log('✅ Category counts updated');

    // Create sample registrations
    const registrations = [
      { user: user1._id, event: createdEvents[0]._id, status: 'confirmed' },
      { user: user1._id, event: createdEvents[4]._id, status: 'confirmed' },
      { user: user1._id, event: createdEvents[9]._id, status: 'confirmed' },
      { user: user2._id, event: createdEvents[0]._id, status: 'confirmed' },
      { user: user2._id, event: createdEvents[2]._id, status: 'confirmed' },
      { user: user2._id, event: createdEvents[6]._id, status: 'confirmed' },
      { user: user2._id, event: createdEvents[7]._id, status: 'confirmed' },
    ];

    await Registration.create(registrations);

    // Update registration counts
    await Event.findByIdAndUpdate(createdEvents[0]._id, { registrationCount: 2 });
    await Event.findByIdAndUpdate(createdEvents[2]._id, { registrationCount: 1 });
    await Event.findByIdAndUpdate(createdEvents[4]._id, { registrationCount: 1 });
    await Event.findByIdAndUpdate(createdEvents[6]._id, { registrationCount: 1 });
    await Event.findByIdAndUpdate(createdEvents[7]._id, { registrationCount: 1 });
    await Event.findByIdAndUpdate(createdEvents[9]._id, { registrationCount: 1 });

    console.log('✅ Registrations created');

    // Create sample notifications
    await Notification.create([
      {
        user: user1._id,
        title: 'Registration Confirmed',
        message: 'You have successfully registered for "Tashkent Tech Summit 2026"',
        type: 'registration',
        relatedEvent: createdEvents[0]._id
      },
      {
        user: user1._id,
        title: 'Welcome to EventHub!',
        message: 'Welcome to EventHub Uzbekistan! Discover exciting events happening near you.',
        type: 'system'
      },
      {
        user: user2._id,
        title: 'Registration Confirmed',
        message: 'You have successfully registered for "Uzbek Classical Music Festival"',
        type: 'registration',
        relatedEvent: createdEvents[2]._id
      }
    ]);
    console.log('✅ Notifications created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin: admin@eventhub.uz / admin123');
    console.log('  User 1: aziz@example.com / user123');
    console.log('  User 2: dilnoza@example.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
