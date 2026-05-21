import { MongoClient, type Collection, type Db } from 'mongodb';

declare global {
  var _passkeyMongoClientPromise: Promise<MongoClient> | undefined;
}

const DEFAULT_DB_NAME = 'passkey-demo';
const DEFAULT_COLLECTION = 'passkey_users';

function requireMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not configured. Add it to .env.local (local) or Vercel project settings.'
    );
  }
  return uri;
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._passkeyMongoClientPromise) {
    global._passkeyMongoClientPromise = new MongoClient(requireMongoUri()).connect();
  }
  return global._passkeyMongoClientPromise;
}

export async function getPasskeyDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB_NAME ?? DEFAULT_DB_NAME);
}

export async function getPasskeyUsersCollection(): Promise<
  Collection<Record<string, unknown>>
> {
  const db = await getPasskeyDb();
  return db.collection(process.env.MONGODB_COLLECTION ?? DEFAULT_COLLECTION);
}
