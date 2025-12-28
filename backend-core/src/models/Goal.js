import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Goal details
  title: { type: String, required: true, trim: true },
  description: String,
  type: { 
    type: String, 
    enum: ['academic', 'financial', 'operational', 'engagement', 'retention', 'custom'],
    required: true
  },
  category: String,
  
  // Target
  targetValue: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, default: '' }, // e.g., 'students', 'R$', '%', 'hours'
  
  // Scope
  scope: {
    type: { type: String, enum: ['global', 'student', 'class', 'course', 'period'], default: 'global' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    period: {
      start: Date,
      end: Date
    }
  },
  
  // Timeline
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  isRecurring: { type: Boolean, default: false },
  recurrence: {
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
    interval: { type: Number, default: 1 }
  },
  
  // Progress tracking
  milestones: [{
    value: Number,
    label: String,
    achievedAt: Date,
    reward: String
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'paused', 'completed', 'failed', 'cancelled'], 
    default: 'active' 
  },
  completedAt: Date,
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  
  // Alerts
  alerts: [{
    threshold: Number, // Percentage
    triggered: { type: Boolean, default: false },
    triggeredAt: Date,
    message: String
  }],
  
  // Notes and updates
  updates: [{
    date: { type: Date, default: Date.now },
    value: Number,
    notes: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Related goals (for goal trees)
  parentGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  subGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  
  // Tags
  tags: [String],
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
}, { timestamps: true });

// Indexes
goalSchema.index({ teacher: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ type: 1 });
goalSchema.index({ endDate: 1 });
goalSchema.index({ 'scope.studentId': 1 });
goalSchema.index({ priority: 1 });

// Virtuals
goalSchema.virtual('progress').get(function() {
  if (this.targetValue === 0) return 0;
  return Math.min(100, Math.round((this.currentValue / this.targetValue) * 100));
});

goalSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

goalSchema.virtual('isOverdue').get(function() {
  return new Date() > new Date(this.endDate) && this.status === 'active';
});

// Methods
goalSchema.methods.updateProgress = function(newValue, notes = '') {
  this.currentValue = newValue;
  this.completionPercentage = this.progress;
  
  // Check milestones
  this.milestones.forEach(milestone => {
    if (!milestone.achievedAt && this.currentValue >= milestone.value) {
      milestone.achievedAt = new Date();
    }
  });
  
  // Check alerts
  this.alerts.forEach(alert => {
    if (!alert.triggered && this.completionPercentage >= alert.threshold) {
      alert.triggered = true;
      alert.triggeredAt = new Date();
    }
  });
  
  // Add update
  this.updates.push({
    value: newValue,
    notes,
    date: new Date()
  });
  
  // Update status
  if (this.completionPercentage >= 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (this.isOverdue) {
    this.status = 'failed';
  }
  
  return this.save();
};

goalSchema.methods.addMilestone = function(value, label, reward = '') {
  this.milestones.push({ value, label, reward });
  return this.save();
};

export default mongoose.model('Goal', goalSchema);

