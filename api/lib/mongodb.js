import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = 'openrpg-db'

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  if (!uri) {
    throw new Error('MONGODB_URI non configuré dans les variables d\'environnement')
  }

  const client = new MongoClient(uri)
  await client.connect()
  
  const db = client.db(dbName)
  
  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollection(collectionName) {
  const { db } = await connectToDatabase()
  return db.collection(collectionName)
}


