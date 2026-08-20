const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_interviewiq';

beforeAll(async () => {
  // Each test file gets its own database on the shared instance so files
  // running in parallel don't clear each other's collections.
  await mongoose.connect(process.env.MONGO_TEST_URI, {
    dbName: `test_${process.env.VITEST_POOL_ID || '0'}_${Date.now()}`,
  });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
