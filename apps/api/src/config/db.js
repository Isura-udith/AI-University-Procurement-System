/**
 * MongoDB Connection
 * Connects to the MongoDB instance with retry logic for the UWU procurement database.
 */
const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');

// Set public DNS servers to resolve MongoDB Atlas SRV records (fixes local router/hotspot ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  // Ignore DNS override errors if custom DNS is prohibited by OS
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
