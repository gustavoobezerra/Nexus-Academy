import mongoose from 'mongoose';

const contentItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Content type
  type: { 
    type: String, 
    enum: ['pdf', 'video', 'audio', 'image', 'exercise', 'presentation', 'link', 'interactive'],
    required: true
  },
  
  // File/URL
  fileUrl: String,
  thumbnailUrl: String,
  fileSize: Number,
  mimeType: String,
  duration: Number, // For video/audio in seconds
  
  // Content details
  subject: String,
  grade: String,
  topic: String,
  tags: [String],
  category: String,
  language: { type: String, default: 'pt-BR' },
  
  // Sharing
  visibility: { 
    type: String, 
    enum: ['private', 'public', 'shared'], 
    default: 'private' 
  },
  sharedWith: [{
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sharedAt: Date,
    permission: { type: String, enum: ['view', 'edit', 'copy'], default: 'view' }
  }],
  
  // Marketplace
  isForSale: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'BRL' },
  sales: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  
  // Quality and reviews
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  reviews: [{
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Usage statistics
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Related
  relatedClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  relatedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  
  // Metadata
  isTemplate: { type: Boolean, default: false },
  templateData: mongoose.Schema.Types.Mixed,
  version: { type: Number, default: 1 },
  parentVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentLibrary' },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived', 'flagged'], 
    default: 'draft' 
  },
  
  // AI generated
  aiGenerated: { type: Boolean, default: false },
  aiPrompt: String
}, { timestamps: true });

// Indexes
contentItemSchema.index({ teacher: 1 });
contentItemSchema.index({ visibility: 1 });
contentItemSchema.index({ type: 1 });
contentItemSchema.index({ subject: 1 });
contentItemSchema.index({ tags: 1 });
contentItemSchema.index({ isForSale: 1 });
contentItemSchema.index({ rating: -1 });
contentItemSchema.index({ views: -1 });
contentItemSchema.index({ createdAt: -1 });

// Text search index
contentItemSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  subject: 'text',
  topic: 'text'
});

// Methods
contentItemSchema.methods.addReview = async function(teacherId, rating, comment) {
  // Remove existing review from same teacher
  this.reviews = this.reviews.filter(r => r.teacherId.toString() !== teacherId.toString());
  
  // Add new review
  this.reviews.push({ teacherId, rating, comment });
  
  // Recalculate average rating
  if (this.reviews.length > 0) {
    this.rating = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
    this.reviewCount = this.reviews.length;
  }
  
  return this.save();
};

contentItemSchema.methods.incrementView = function() {
  this.views += 1;
  return this.save();
};

contentItemSchema.methods.toggleFavorite = function(userId) {
  const index = this.favoritedBy.findIndex(id => id.toString() === userId.toString());
  if (index > -1) {
    this.favoritedBy.splice(index, 1);
    this.favorites -= 1;
  } else {
    this.favoritedBy.push(userId);
    this.favorites += 1;
  }
  return this.save();
};

export default mongoose.model('ContentLibrary', contentItemSchema);

