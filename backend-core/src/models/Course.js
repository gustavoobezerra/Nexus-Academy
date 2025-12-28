import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  order: { type: Number, required: true },
  lessons: [{
    title: { type: String, required: true },
    description: String,
    duration: { type: Number, default: 60 },
    order: { type: Number, required: true },
    content: String,
    materials: [{ type: { type: String, enum: ['video', 'document', 'link', 'exercise'] }, title: String, url: String }],
    isCompleted: { type: Boolean, default: false }
  }]
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  subject: { type: String, trim: true },
  grade: { type: String, trim: true },
  thumbnail: String,

  // Structure
  modules: [moduleSchema],
  totalLessons: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },

  // Settings
  isPublic: { type: Boolean, default: false },
  isTemplate: { type: Boolean, default: false },
  allowSelfEnrollment: { type: Boolean, default: false },
  maxStudents: { type: Number },
  price: { type: Number, default: 0 },

  // Certificate
  hasCertificate: { type: Boolean, default: true },
  certificateTemplate: String,
  minimumScore: { type: Number, default: 70 },

  // Enrollments
  enrollments: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    enrolledAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ moduleIndex: Number, lessonIndex: Number, completedAt: Date }],
    currentModule: { type: Number, default: 0 },
    currentLesson: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'completed', 'dropped'], default: 'active' },
    completedAt: Date,
    certificateUrl: String,
    finalScore: Number
  }],

  // Metadata
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  tags: [String],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' }
}, { timestamps: true });

courseSchema.index({ teacher: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ isPublic: 1 });
courseSchema.index({ 'enrollments.student': 1 });

courseSchema.pre('save', function(next) {
  this.totalLessons = this.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
  this.totalDuration = this.modules.reduce((sum, mod) =>
    sum + mod.lessons.reduce((lSum, lesson) => lSum + (lesson.duration || 0), 0), 0);
  next();
});

export default mongoose.model('Course', courseSchema);
