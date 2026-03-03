import { randomUUID } from 'crypto';

const correlationId = (req, res, next) => {
  const id = req.headers['x-correlation-id'] || req.headers['x-request-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('x-correlation-id', id);
  next();
};

export default correlationId;
