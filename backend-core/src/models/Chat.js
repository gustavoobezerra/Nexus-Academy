import mongoose from 'mongoose';

// Chat Message Schema
const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: {
    type: { type: String, enum: ['teacher', 'student', 'parent', 'system'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    avatar: String
  },
  content: { type: String, required: true, trim: true },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'audio', 'video', 'system'], 
    default: 'text' 
  },
  
  // Attachments
  attachments: [{
    type: { type: String, enum: ['image', 'file', 'audio', 'video'] },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'], 
    default: 'sent' 
  },
  readAt: Date,
  deliveredAt: Date,
  
  // Reactions
  reactions: [{
    userId: mongoose.Schema.Types.ObjectId,
    emoji: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Reply/Forward
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  
  // Metadata
  editedAt: Date,
  deletedAt: Date,
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Chat Schema (conversation)
const chatSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Participants
  participants: [{
    type: { type: String, enum: ['student', 'parent'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
    avatar: String,
    lastSeen: Date,
    unreadCount: { type: Number, default: 0 }
  }],
  
  // Chat metadata
  type: { 
    type: String, 
    enum: ['student', 'parent', 'group'], 
    default: 'student' 
  },
  title: String, // For group chats
  description: String,
  
  // Related entities
  relatedStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  relatedClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  
  // Settings
  isArchived: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  
  // Last message info (for list display)
  lastMessage: {
    content: String,
    senderName: String,
    sentAt: Date,
    messageType: String
  },
  
  // Statistics
  totalMessages: { type: Number, default: 0 },
  unreadMessages: { type: Number, default: 0 }
}, { timestamps: true });

// Indexes
chatSchema.index({ teacher: 1 });
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ relatedStudent: 1 });
chatSchema.index({ isArchived: 1, updatedAt: -1 });
chatSchema.index({ isPinned: -1, updatedAt: -1 });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ 'sender.userId': 1 });
messageSchema.index({ status: 1 });

// Virtuals
chatSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat'
});

// Methods
chatSchema.methods.markAsRead = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.unreadCount = 0;
    participant.lastSeen = new Date();
  }
  this.unreadMessages = this.participants.reduce((sum, p) => sum + p.unreadCount, 0);
  return this.save();
};

chatSchema.methods.addUnread = function(userId) {
  this.participants.forEach(p => {
    if (p.userId.toString() !== userId.toString()) {
      p.unreadCount += 1;
    }
  });
  this.unreadMessages = this.participants.reduce((sum, p) => sum + p.unreadCount, 0);
  return this.save();
};

export const Chat = mongoose.model('Chat', chatSchema);
export const Message = mongoose.model('Message', messageSchema);

