import mongoose from 'mongoose';

// Question Schema
const questionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['multiple_choice', 'true_false', 'fill_blank', 'essay', 'matching', 'ordering'], 
    required: true 
  },
  question: { type: String, required: true, trim: true },
  description: String,
  
  // Multiple Choice
  options: [{
    text: String,
    isCorrect: { type: Boolean, default: false },
    explanation: String
  }],
  
  // True/False
  correctAnswer: Boolean,
  
  // Fill Blank
  blanks: [{
    position: Number,
    correctAnswer: String,
    alternatives: [String]
  }],
  
  // Essay
  rubric: [{
    criterion: String,
    points: Number,
    description: String
  }],
  
  // Points and settings
  points: { type: Number, default: 1, min: 0 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeLimit: Number, // seconds per question
  
  // Media
  imageUrl: String,
  videoUrl: String,
  audioUrl: String,
  
  // Tags and categorization
  tags: [String],
  topic: String,
  subject: String,
  
  // AI generated
  aiGenerated: { type: Boolean, default: false },
  aiPrompt: String
}, { timestamps: true });

// Quiz Schema
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Questions
  questions: [questionSchema],
  totalQuestions: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  
  // Settings
  timeLimit: Number, // Total time in minutes
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showResults: { type: Boolean, default: true },
  showCorrectAnswers: { type: Boolean, default: true },
  allowRetake: { type: Boolean, default: false },
  maxAttempts: { type: Number, default: 1 },
  
  // Access
  isPublic: { type: Boolean, default: false },
  accessCode: String,
  availableFrom: Date,
  availableUntil: Date,
  
  // Related
  relatedClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  relatedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  relatedStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  
  // Statistics
  totalAttempts: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }
}, { timestamps: true });

// Quiz Attempt Schema
const quizAttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Answers
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    questionIndex: Number,
    answer: mongoose.Schema.Types.Mixed, // Can be string, array, object
    isCorrect: Boolean,
    pointsEarned: Number,
    timeSpent: Number, // seconds
    answeredAt: Date
  }],
  
  // Timing
  startedAt: { type: Date, required: true },
  submittedAt: Date,
  timeSpent: Number, // Total seconds
  
  // Results
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
  
  // Status
  status: { 
    type: String, 
    enum: ['in_progress', 'submitted', 'graded', 'expired'], 
    default: 'in_progress' 
  },
  
  // AI grading (for essays)
  aiGraded: { type: Boolean, default: false },
  aiFeedback: String,
  teacherReviewed: { type: Boolean, default: false },
  teacherNotes: String,
  
  // Attempt number
  attemptNumber: { type: Number, default: 1 }
}, { timestamps: true });

// Indexes
quizSchema.index({ teacher: 1 });
quizSchema.index({ status: 1 });
quizSchema.index({ relatedClass: 1 });
quizSchema.index({ relatedStudent: 1 });
quizSchema.index({ isPublic: 1 });

quizAttemptSchema.index({ quiz: 1, student: 1 });
quizAttemptSchema.index({ student: 1, createdAt: -1 });
quizAttemptSchema.index({ teacher: 1 });
quizAttemptSchema.index({ status: 1 });

// Pre-save hooks
quizSchema.pre('save', function(next) {
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  next();
});

quizAttemptSchema.pre('save', function(next) {
  if (this.submittedAt && this.startedAt) {
    this.timeSpent = Math.floor((this.submittedAt - this.startedAt) / 1000);
  }
  if (this.status === 'submitted' || this.status === 'graded') {
    this.totalPoints = this.answers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
    const quizTotal = this.totalPoints || 100;
    this.percentage = quizTotal > 0 ? Math.round((this.totalPoints / quizTotal) * 100) : 0;
    
    // Calculate grade
    if (this.percentage >= 90) this.grade = 'A';
    else if (this.percentage >= 80) this.grade = 'B';
    else if (this.percentage >= 70) this.grade = 'C';
    else if (this.percentage >= 60) this.grade = 'D';
    else this.grade = 'F';
  }
  next();
});

// Methods
quizSchema.methods.calculateStatistics = async function() {
  const attempts = await QuizAttempt.find({ quiz: this._id, status: 'graded' });
  if (attempts.length === 0) return;
  
  this.totalAttempts = attempts.length;
  this.averageScore = attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length;
  this.completionRate = (attempts.filter(a => a.status === 'graded').length / attempts.length) * 100;
  await this.save();
};

export const Quiz = mongoose.model('Quiz', quizSchema);
export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

