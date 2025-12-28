import mongoose from 'mongoose';
import crypto from 'crypto';

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  
  // Certificate details
  certificateNumber: { type: String, unique: true, required: true },
  title: { type: String, required: true, trim: true },
  description: String,
  issueDate: { type: Date, default: Date.now },
  expiryDate: Date,
  
  // Achievement
  achievementType: { 
    type: String, 
    enum: ['course_completion', 'milestone', 'excellence', 'participation', 'custom'],
    required: true
  },
  score: Number,
  grade: String,
  completionDate: Date,
  
  // Template
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate' },
  templateData: {
    backgroundColor: String,
    borderColor: String,
    logoUrl: String,
    signatureUrl: String,
    customFields: mongoose.Schema.Types.Mixed
  },
  
  // Files
  pdfUrl: String,
  imageUrl: String,
  qrCodeUrl: String,
  
  // Verification
  verificationCode: { type: String, unique: true, required: true },
  verificationUrl: String,
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  
  // Sharing
  sharedOn: [{
    platform: { type: String, enum: ['linkedin', 'facebook', 'twitter', 'whatsapp'] },
    sharedAt: Date
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['issued', 'revoked', 'expired'], 
    default: 'issued' 
  },
  revokedAt: Date,
  revokeReason: String
}, { timestamps: true });

// Pre-save hook to generate certificate number and verification code
certificateSchema.pre('save', function(next) {
  if (!this.certificateNumber) {
    this.certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  
  if (!this.verificationCode) {
    this.verificationCode = crypto.randomBytes(16).toString('hex');
  }
  
  if (!this.verificationUrl) {
    this.verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${this.verificationCode}`;
  }
  
  next();
});

// Indexes
certificateSchema.index({ student: 1 });
certificateSchema.index({ teacher: 1 });
certificateSchema.index({ course: 1 });
certificateSchema.index({ certificateNumber: 1 });
certificateSchema.index({ verificationCode: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ issueDate: -1 });

// Methods
certificateSchema.methods.verify = function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  return this.save();
};

certificateSchema.methods.revoke = function(reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

export default mongoose.model('Certificate', certificateSchema);

