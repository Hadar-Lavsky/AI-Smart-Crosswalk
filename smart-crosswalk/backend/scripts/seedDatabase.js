import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Camera, LED, Crosswalk, Alert } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:3000';
const ALERT_COUNT = 70;

/** YOLO detection output images (served from /api/images/) */
const IMAGE_FILENAMES = [
  'Mock_img.jpg',
  'bus.jpg',
  'mock02.jpg',
  'gettyimages-1001835308-612x612.jpg',
  'gettyimages-1702547144-612x612.jpg',
  'gettyimages-2147574959-612x612.jpg',
  'gettyimages-2226203102-612x612.jpg',
  'gettyimages-2226203119-612x612.jpg',
  'gettyimages-629331643-612x612.jpg',
];

/** Danger level distribution: ~40% LOW, ~40% MEDIUM, ~20% HIGH */
const DANGER_LEVELS = [
  ...Array(40).fill('LOW'),
  ...Array(40).fill('MEDIUM'),
  ...Array(20).fill('HIGH'),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick a random item from an array. */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Random date between `daysAgo` days in the past and now. */
const randomDate = (daysAgo = 30) => {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
};

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const seedDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ---- Clear existing data ------------------------------------------------
    console.log('\n🗑  Clearing existing data...');
    await Alert.deleteMany({});
    await Crosswalk.deleteMany({});
    await Camera.deleteMany({});
    await LED.deleteMany({});
    console.log('   ✅ Collections cleared');

    // ---- Cameras ------------------------------------------------------------
    console.log('\n📷 Creating cameras...');
    const camera1 = await Camera.create({ status: 'active' });
    const camera2 = await Camera.create({ status: 'active' });
    const camera3 = await Camera.create({ status: 'inactive' });
    console.log(`   ✅ Created 3 cameras`);

    // ---- LEDs ---------------------------------------------------------------
    console.log('\n💡 Creating LEDs...');
    const led1 = await LED.create({});
    const led2 = await LED.create({});
    const led3 = await LED.create({});
    console.log(`   ✅ Created 3 LEDs`);

    // ---- Crosswalks ---------------------------------------------------------
    console.log('\n🚶 Creating crosswalks...');
    const crosswalk1 = await Crosswalk.create({
      location: { city: 'תל אביב', street: 'דיזנגוף', number: '50' },
      cameraId: camera1._id,
      ledId: led1._id,
    });
    const crosswalk2 = await Crosswalk.create({
      location: { city: 'תל אביב', street: 'אבן גבירול', number: '123' },
      cameraId: camera2._id,
      ledId: led2._id,
    });
    const crosswalk3 = await Crosswalk.create({
      location: { city: 'ירושלים', street: 'יפו', number: '234' },
      cameraId: camera3._id,
      ledId: led3._id,
    });
    const crosswalks = [crosswalk1, crosswalk2, crosswalk3];
    console.log(`   ✅ Created 3 crosswalks`);

    // ---- Alerts (70) --------------------------------------------------------
    console.log(`\n⚠️  Creating ${ALERT_COUNT} alerts...`);

    const alertDocs = [];
    for (let i = 0; i < ALERT_COUNT; i++) {
      // ~10% of alerts have no crosswalk (unlinked YOLO detections)
      const hasCrosswalk = Math.random() > 0.1;

      alertDocs.push({
        dangerLevel: pick(DANGER_LEVELS),
        crosswalkId: hasCrosswalk ? pick(crosswalks)._id : null,
        imageUrl: `${API_BASE}/api/images/${IMAGE_FILENAMES[i % IMAGE_FILENAMES.length]}`,
        timestamp: randomDate(30),
      });
    }

    // Sort by timestamp so the list looks natural (newest first in the DB)
    alertDocs.sort((a, b) => a.timestamp - b.timestamp);

    await Alert.insertMany(alertDocs);
    console.log(`   ✅ Created ${ALERT_COUNT} alerts`);

    // ---- Summary ------------------------------------------------------------
    const stats = alertDocs.reduce(
      (acc, a) => { acc[a.dangerLevel]++; return acc; },
      { LOW: 0, MEDIUM: 0, HIGH: 0 },
    );

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Cameras:    3');
    console.log('   - LEDs:       3');
    console.log('   - Crosswalks: 3');
    console.log(`   - Alerts:     ${ALERT_COUNT}  (HIGH: ${stats.HIGH}, MEDIUM: ${stats.MEDIUM}, LOW: ${stats.LOW})`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

seedDatabase();
