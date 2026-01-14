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
      console.info('✅ MongoDB already connected');
      return mongoose.connection;
    }

    const mongoUri = process.env.MONGO_URI;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!mongoUri) {
      if (isProduction) {
        throw new Error('MONGO_URI must be defined in production');
      }
      console.warn('⚠️ MONGO_URI não definida. Usando MongoDB local para desenvolvimento.');
    }

    const resolvedMongoUri = mongoUri || 'mongodb://localhost:27017/nexus-academy';

    const conn = await mongoose.connect(resolvedMongoUri, connectionOptions);

    isConnected = true;
    reconnectAttempts = 0;

    console.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    // DEBUG: console.log(`   Database: ${conn.connection.name}`);
    // DEBUG: console.log(`   Ready State: ${conn.connection.readyState}`);

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
        // DEBUG: console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
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
      console.info('✅ MongoDB reconnected successfully');
      isConnected = true;
      reconnectAttempts = 0;
    });

    mongoose.connection.on('connecting', () => {
      // DEBUG: console.log('🔄 Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      // DEBUG: console.log('✅ MongoDB connection established');
      isConnected = true;
    });

    // Monitorar performance
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        // DEBUG: console.log(`[Mongoose] ${collectionName}.${method}`, query);
      });
    }

    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Stack:', error.stack);
    
    const isProduction = process.env.NODE_ENV === 'production';
    const hasMongoUri = Boolean(process.env.MONGO_URI);

    if (isProduction && !hasMongoUri) {
      throw error;
    }

    // Em produção, não encerrar o processo imediatamente
    if (isProduction) {
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
      // DEBUG: console.log('✅ MongoDB connection closed gracefully');
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
