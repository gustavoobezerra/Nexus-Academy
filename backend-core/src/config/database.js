import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Configurações otimizadas de conexão
const connectionOptions = {
  maxPoolSize: 20, // Aumentado para melhor performance
  minPoolSize: 5, // Pool mínimo para manter conexões ativas
  serverSelectionTimeoutMS: 10000, // Aumentado para ambientes com latência
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  // Otimizações de performance
  bufferCommands: false,
};

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 segundos

const connectDB = async () => {
  try {
    // Evitar múltiplas conexões
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return mongoose.connection;
    }

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-academy';

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    isConnected = true;
    reconnectAttempts = 0;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState}`);

    // Event listeners melhorados
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      isConnected = false;
      
      // Tentar reconectar automaticamente
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
          connectDB().catch(err => {
            console.error('Reconnection failed:', err.message);
          });
        }, RECONNECT_DELAY);
      } else {
        console.error('❌ Max reconnection attempts reached. Please check MongoDB connection.');
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
      isConnected = true;
      reconnectAttempts = 0;
    });

    mongoose.connection.on('connecting', () => {
      console.log('🔄 Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connection established');
      isConnected = true;
    });

    // Monitorar performance
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(`[Mongoose] ${collectionName}.${method}`, query);
      });
    }

    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Stack:', error.stack);
    
    // Em produção, não encerrar o processo imediatamente
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ Running in production mode. Will retry connection...');
      // Retry após delay
      setTimeout(() => {
        connectDB().catch(err => {
          console.error('Retry failed:', err.message);
        });
      }, RECONNECT_DELAY);
    } else {
      process.exit(1);
    }
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnected = false;
      console.log('✅ MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    throw error;
  }
};

export const isDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

export const getConnectionStats = () => {
  if (!mongoose.connection.readyState) {
    return null;
  }

  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models).length,
  };
};

export default connectDB;
