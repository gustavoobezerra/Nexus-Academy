import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format
const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        customFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

export default logger;
