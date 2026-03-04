import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const cleanDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Clear all data from existing collections
    console.log('\n🧹 Clearing all data from collections...');
    
    const collections = ['alerts', 'crosswalks', 'cameras', 'leds'];
    
    for (const collectionName of collections) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        if (count > 0) {
          await db.collection(collectionName).deleteMany({});
          console.log(`   ✅ Removed ${count} documents from ${collectionName}`);
        } else {
          console.log(`   ℹ️  No documents in ${collectionName}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Collection ${collectionName} not found`);
      }
    }

    console.log('\n📊 Database status after cleanup:');
    const allCollections = await db.listCollections().toArray();
    console.log('   Collections:', allCollections.map(c => c.name).join(', '));

    console.log('\n✨ Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the cleanup
cleanDatabase();
