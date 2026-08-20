import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

// One shared mongod for the whole run: per-file instances race for the same
// binary lockfile and multiply cold-start cost.
export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_TEST_URI = mongod.getUri();
}

export async function teardown() {
  await mongod.stop();
}
