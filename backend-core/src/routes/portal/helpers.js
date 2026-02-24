import mongoose from 'mongoose';

export const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be defined in environment variables');
  return secret;
};

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const loadChatModel = async () => {
  const module = await import('../../models/Chat.js');
  if (!module?.default) throw new Error('Chat model not available');
  return module.default;
};
