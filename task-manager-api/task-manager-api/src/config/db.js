const mongoose = require('mongoose');
const { mongoUri } = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(mongoUri, {
    maxPoolSize: 50, // handle concurrent load
    serverSelectionTimeoutMS: 5000,
    autoIndex: true, // builds the compound indexes declared in the models
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
