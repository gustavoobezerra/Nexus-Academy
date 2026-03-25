export interface Aluno {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  grade: string;
  monthlyFee?: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  paymentStatus?: 'paid' | 'pending' | 'late' | 'overdue';
  status?: string;
  subject?: string;
  nextClass?: string;
  points?: number;
  level?: number;
  performance?: {
    overall: number;
    trend: 'up' | 'down' | 'stable';
    strengths?: string[];
    weaknesses?: string[];
  };
  profile?: {
    avatar?: string | null;
    description?: string;
    interests?: string[];
  };
  portalAccess?: {
    enabled?: boolean;
    email?: string;
  };
  onboardingCompleted?: boolean;
  teacher?: {
    id?: string;
    _id?: string;
    name: string;
    email?: string;
    avatar?: string | null;
  } | null;
  createdAt?: string;
}

export interface Pagamento {
  id?: string;
  _id?: string;
  studentId?: string;
  studentName?: string;
  student?: { name: string; _id: string };
  amount: number;
  month: string;
  year: number;
  status: 'pending' | 'paid' | 'late' | 'overdue';
  dueDate: string;
  paidAt?: string;
}

export interface Aula {
  id?: string;
  _id?: string;
  title: string;
  studentId: string;
  studentName: string;
  subject: string;
  grade: string;
  topic?: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isLive: boolean;
  meetingLink?: string;
  notes?: string;
}

export interface LiveSession {
  id: string;
  classId: string;
  teacherId: string;
  studentIds: string[];
  startTime: Date;
  endTime?: Date;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  exercises?: Exercise[];
  engagement?: EngagementMetrics;
  status: 'active' | 'ended' | 'archived';
}

export interface Exercise {
  id: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer?: string;
  explanation?: string;
  createdAt: Date;
}

export interface EngagementMetrics {
  totalParticipants: number;
  activeParticipants: number;
  averageAttention: number;
  questionCount: number;
  troubleTopics: string[];
}

export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  activeStudents: number;
  inactiveStudents: number;
  averageTicket: number;
  expectedMonthlyRevenue: number;
  overduePayments: number;
  paymentRate: number;
}

export interface StudentPaymentStatus {
  studentId: string;
  studentName: string;
  monthlyFee: number;
  currentStatus: 'paid' | 'pending' | 'late' | 'overdue';
  daysOverdue: number;
  lastPaymentDate?: string;
  nextDueDate?: string;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  riskScore: number;
  reason: string;
  lastActivityDate?: string;
  daysInactive: number;
  recommendation: string;
}

export interface RetentionMetrics {
  activeStudents: number;
  totalChurn: number;
  churnRate: number;
  atRiskStudents: AtRiskStudent[];
}

export interface TimeManagementMetrics {
  weeklyHours: number;
  monthlyHours: number;
  classesThisMonth: number;
  occupancyRate: number;
  availableSlots: number;
  suggestedSlots: string[];
}

export interface PedagogicalMetrics {
  averagePerformance: number;
  topicsDifficulty: Array<{ topic: string; difficulty: number; count: number }>;
  improvementRate: number;
  studentsByPerformance: Array<{ studentName: string; score: number; trend: 'up' | 'down' | 'stable' }>;
}

export interface TeacherAnalytics {
  financial: FinancialMetrics;
  retention: RetentionMetrics;
  timeManagement: TimeManagementMetrics;
  pedagogical: PedagogicalMetrics;
  lastUpdated: string;
}

export interface Notification {
  id?: string;
  _id?: string;
  type: 'reminder' | 'payment' | 'confirmation' | 'feedback' | 'general' | 'system';
  recipientId?: string;
  recipientName?: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  entityType?: string;
  entityId?: string;
  status: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  templateId?: string;
  createdAt?: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  status: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  createdAt?: string;
  readAt?: string | null;
  entityType?: string;
  gameId?: string | null;
  route?: string | null;
  invitedBy?: string | null;
  category?: string | null;
  hint?: string | null;
  turnDurationSeconds?: number | null;
  kind?: string;
}

export interface NotificationTemplate {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  type: 'class_reminder' | 'payment_reminder' | 'payment_overdue' | 'birthday' | 'welcome' | 'feedback' | 'report' | 'custom';
  channel: 'email' | 'whatsapp' | 'sms' | 'push' | 'in_app';
  subject?: string;
  body: string;
  variables: string[];
  category?: string;
  active: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassFeedback {
  id?: string;
  _id?: string;
  classId: string;
  studentId: string;
  studentName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt?: string;
}

export interface StudentMaterial {
  id?: string;
  _id?: string;
  classId: string;
  className: string;
  topic: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'exercise';
  url: string;
  description?: string;
  uploadedAt?: string;
}

export interface TeachingTemplate {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  subject: string;
  duration: number;
  structure: {
    warmup?: string;
    mainTopic: string;
    exercises?: string;
    closing?: string;
  };
  materials?: string[];
  createdAt?: string;
}

export interface StudentGrade {
  id?: string;
  _id?: string;
  studentId: string;
  classId: string;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  assessmentType: 'quiz' | 'exercise' | 'test' | 'participation';
  createdAt?: string;
}

export interface ReferralLink {
  id?: string;
  _id?: string;
  teacherId: string;
  code: string;
  fullUrl: string;
  totalReferred: number;
  activeReferred: number;
  totalBonus: number;
  createdAt?: string;
}

export interface CoursePlan {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  totalModules: number;
  modules: Array<{
    order: number;
    name: string;
    topics: string[];
    duration: number;
    students: string[];
  }>;
  createdAt?: string;
}

// ============ NOVAS INTERFACES - AUTOMAÇÃO COM IA ============

// Banco de Horas
export interface HourBank {
  id?: string;
  _id?: string;
  student: string;
  studentName?: string;
  totalHoursPurchased: number;
  hoursConsumed: number;
  hoursRemaining: number;
  packageType: 'monthly_4h' | 'monthly_8h' | 'monthly_12h' | 'custom';
  renewalDate: string;
  history: HourBankHistory[];
  alerts: HourBankAlert[];
  autoRenew: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HourBankHistory {
  date: string;
  type: 'purchase' | 'consumption' | 'refund' | 'bonus';
  hours: number;
  classId?: string;
  className?: string;
  description?: string;
}

export interface HourBankAlert {
  type: 'low_hours_25' | 'low_hours_10' | 'hours_depleted' | 'renewal_reminder';
  sentAt: string;
  acknowledged: boolean;
}

// Contratos Digitais
export interface Contract {
  id?: string;
  _id?: string;
  student: string;
  teacher: string;
  templateId: string;
  status: 'draft' | 'sent' | 'signed' | 'cancelled' | 'expired';
  contractData: ContractData;
  generatedContent: string;
  signatures: ContractSignatures;
  pdfUrl?: string;
  signatureLink?: string;
  expiresAt?: string;
  sentAt?: string;
  signedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractData {
  studentName: string;
  studentAge?: number;
  studentGrade?: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  parentCPF?: string;
  parentRG?: string;
  teacherName?: string;
  teacherCPF?: string;
  teacherPhone?: string;
  serviceDescription?: string;
  monthlyFee: number;
  hoursPerMonth?: number;
  paymentDay?: number;
  startDate: string;
  endDate?: string;
  customClauses?: string[];
  additionalTerms?: string;
}

export interface ContractSignatures {
  parent: SignatureInfo;
  teacher: SignatureInfo;
}

export interface SignatureInfo {
  signed: boolean;
  signedAt?: string;
  ipAddress?: string;
  signatureImage?: string;
}

// Análise de IA
export interface AIAnalysis {
  id?: string;
  _id?: string;
  student: string;
  studentName?: string;
  analysisType: 'performance_prediction' | 'difficulty_detection' | 'evasion_risk' | 'learning_style' | 'topic_recommendation' | 'engagement_analysis';
  classId?: string;
  data: AIAnalysisData;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
  confidence: number;
  processedAt: string;
  validUntil: string;
  createdAt?: string;
}

export interface AIAnalysisData {
  rawData?: unknown;
  performanceScore?: number;
  performanceTrend?: 'improving' | 'stable' | 'declining';
  difficultTopics?: DifficultTopic[];
  evasionRisk?: EvasionRisk;
  learningStyle?: LearningStyle;
  engagementMetrics?: EngagementMetricsDetailed;
}

export interface DifficultTopic {
  topic: string;
  difficultyLevel: number;
  errorCount: number;
  lastAttempt?: string;
}

export interface EvasionRisk {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  lastActivity?: string;
  daysInactive: number;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface LearningStyle {
  visual: number;
  auditory: number;
  kinesthetic: number;
  readingWriting: number;
}

export interface EngagementMetricsDetailed {
  averageAttention: number;
  participationRate: number;
  questionFrequency: number;
  homeworkCompletionRate: number;
}

export interface AIInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionable: boolean;
  suggestedAction?: string;
}

export interface AIRecommendation {
  category: 'content' | 'methodology' | 'pacing' | 'material' | 'schedule';
  recommendation: string;
  rationale: string;
  expectedImpact: 'low' | 'medium' | 'high';
}

// Atividades geradas automaticamente
export interface Activity {
  id?: string;
  _id?: string;
  class: string;
  student: string;
  teacher: string;
  title: string;
  description?: string;
  type: 'quiz' | 'exercise' | 'homework' | 'test' | 'practice';
  questions: Question[];
  totalPoints: number;
  status: 'draft' | 'published' | 'completed' | 'graded';
  dueDate?: string;
  submissions: Submission[];
  generatedByAI: boolean;
  aiMetadata?: ActivityAIMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  questionNumber: number;
  type: 'multiple_choice' | 'essay' | 'true_false' | 'fill_blank' | 'matching';
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  topics?: string[];
}

export interface QuestionOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface Submission {
  submittedAt: string;
  answers: SubmissionAnswer[];
  score: number;
  percentage: number;
  autoGraded: boolean;
  gradedAt?: string;
  teacherFeedback?: string;
}

export interface SubmissionAnswer {
  questionNumber: number;
  answer: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  feedback?: string;
}

export interface ActivityAIMetadata {
  sourceTranscript?: string;
  topics: string[];
  generatedAt: string;
  providerMode?: 'live' | 'fallback';
  sourceType?: 'class' | 'manual';
  batchId?: string;
  targetMode?: 'specific' | 'group' | 'all';
  gradeLevel?: string;
  learningObjective?: string;
  reviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PortalActivitySummary {
  _id: string;
  title: string;
  description?: string;
  type: Activity['type'];
  dueDate?: string;
  status: Activity['status'];
  totalPoints: number;
  totalQuestions: number;
  createdAt?: string;
  updatedAt?: string;
  aiMetadata?: ActivityAIMetadata | null;
  submissionCount: number;
  latestSubmission?: Submission | null;
}

export interface PortalActivityDetail extends PortalActivitySummary {
  questions: Question[];
}

export interface TeacherActivitySubmissionDetail extends Submission {
  submissionIndex: number;
}

export interface TeacherActivitySummary {
  id: string;
  _id: string;
  title: string;
  description?: string;
  type: Activity['type'];
  status: Activity['status'];
  dueDate?: string;
  totalPoints: number;
  studentId: string;
  studentName: string;
  classId?: string;
  classTitle?: string;
  aiMetadata?: ActivityAIMetadata | null;
  createdAt?: string;
  updatedAt?: string;
  submissionCount: number;
  latestSubmission?: TeacherActivitySubmissionDetail | null;
  needsReview: boolean;
}

export interface TeacherActivityDetail extends TeacherActivitySummary {
  questions: Question[];
  submissions: TeacherActivitySubmissionDetail[];
}

export interface ActivityReviewSuggestion {
  answers: Array<{
    questionNumber: number;
    isCorrect: boolean;
    pointsEarned: number;
    feedback: string;
  }>;
  teacherFeedback: string;
}

// Preparação automática de aulas
export interface LessonPreparation {
  id?: string;
  _id?: string;
  class: string;
  student: string;
  teacher: string;
  topic: string;
  subtopics: string[];
  objectives: LessonObjective[];
  structure: LessonStructure;
  materials: LessonMaterial[];
  prerequisites: string[];
  anticipatedDifficulties: AnticipatedDifficulty[];
  differentiation: Differentiation;
  assessmentPlan: AssessmentPlan;
  generatedByAI: boolean;
  aiMetadata?: LessonAIMetadata;
  teacherReview?: TeacherReview;
  status: 'draft' | 'ready' | 'in_use' | 'completed';
  executionNotes?: ExecutionNotes;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonObjective {
  objective: string;
  priority: 'primary' | 'secondary' | 'optional';
}

export interface LessonStructure {
  warmup: LessonPhase;
  mainContent: MainContentPhase;
  practice: PracticePhase;
  review: ReviewPhase;
  homework: HomeworkPhase;
}

export interface LessonPhase {
  duration: number;
  description?: string;
  activities?: string[];
}

export interface MainContentPhase extends LessonPhase {
  keyPoints?: string[];
  teachingMethod?: 'exposition' | 'discussion' | 'practice' | 'project' | 'game' | 'mixed';
  materials?: string[];
}

export interface PracticePhase {
  duration: number;
  exercises: PracticeExercise[];
}

export interface PracticeExercise {
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  estimatedTime: number;
}

export interface ReviewPhase {
  duration: number;
  keyTakeaways: string[];
  questionsToAsk: string[];
}

export interface HomeworkPhase {
  assigned: boolean;
  description?: string;
  dueDate?: string;
  estimatedTime?: number;
}

export interface LessonMaterial {
  type: 'presentation' | 'video' | 'document' | 'link' | 'image' | 'interactive';
  title: string;
  url?: string;
  description?: string;
}

export interface AnticipatedDifficulty {
  concept: string;
  strategy: string;
  examples: string[];
}

export interface Differentiation {
  forStruggling: string[];
  forAdvanced: string[];
  visualLearners: string[];
  auditoryLearners: string[];
  kinestheticLearners: string[];
}

export interface AssessmentPlan {
  formative: string[];
  summative?: string;
  selfAssessment: boolean;
}

export interface LessonAIMetadata {
  basedOn: {
    previousClasses: string[];
    studentPerformance: unknown;
    detectedDifficulties: string[];
  };
  generatedAt: string;
  confidence: number;
  providerMode?: 'live' | 'fallback';
}

export interface TeacherReview {
  reviewed: boolean;
  reviewedAt?: string;
  modifications: string[];
  approved: boolean;
  notes?: string;
}

export interface ExecutionNotes {
  actualDuration?: number;
  whatWorkedWell: string[];
  whatNeedsImprovement: string[];
  studentEngagement: 'low' | 'medium' | 'high';
  objectivesAchieved: boolean[];
}

// Agendamento Inteligente
export interface SmartScheduleSuggestion {
  date: string;
  time: string;
  score: number;
  reason: string;
  conflicts: string[];
  studentPreference?: boolean;
  teacherAvailability?: boolean;
}

export interface StudentGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  studentIds: string[];
  suggestedByAI?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningSubjectSummary {
  label: string;
  averageScore: number;
  signalCount: number;
}

export interface LearningTopicSummary extends LearningSubjectSummary {
  subject: string;
  sourceType: 'activity' | 'pronunciation' | 'assessment' | 'classroom';
}

export interface StudentLearningSnapshot {
  studentId: string;
  totalSignals: number;
  averageScore: number;
  objectiveAccuracy: number | null;
  pronunciationAverage: number | null;
  weakestSubjects: LearningSubjectSummary[];
  weakestTopics: LearningTopicSummary[];
  lastSignalAt?: string | null;
}

export interface SubjectSuggestion {
  subject: string;
  topic: string;
  explanation: string;
  evidence: string[];
  basedOn: {
    signalCount: number;
    averageScore: number;
    sourceTypes: string[];
  };
}

export interface AIProviderInfo {
  provider: string;
  configured: boolean;
  available: boolean;
  mode: 'live' | 'fallback';
  health?: 'healthy' | 'degraded' | 'fallback-only';
  primaryModel?: string | null;
  fallbackModels?: string[];
  models: string[];
  providerModel?: string | null;
  lastCheckedAt?: string | null;
  lastError?: {
    model?: string | null;
    status?: number | null;
    code?: string | null;
    message?: string | null;
    capturedAt?: string | null;
  } | null;
}

export interface TeacherWorkspaceData {
  provider: AIProviderInfo;
  students: Aluno[];
  classes: Aula[];
  payments: Pagamento[];
  activities: Array<Activity & { studentName?: string; classTitle?: string }>;
  lessonPreparations: Array<LessonPreparation & { studentName?: string; classTitle?: string }>;
  learningSnapshots: StudentLearningSnapshot[];
  studentGroups: StudentGroup[];
  counts: {
    students: number;
    classes: number;
    payments: number;
    activities: number;
    lessonPreparations: number;
    studentGroups: number;
  };
  windows?: {
    classesLoaded: number;
    paymentsLoaded: number;
    activitiesLoaded: number;
    lessonPreparationsLoaded: number;
    classesTruncated: boolean;
    paymentsTruncated: boolean;
    activitiesTruncated: boolean;
    lessonPreparationsTruncated: boolean;
  };
}

// Marketplace com Pontos
export interface MarketplaceItem {
  id?: string;
  _id?: string;
  teacher: string;
  teacherName?: string;
  title: string;
  description: string;
  category: 'extra_class' | 'study_material' | 'mentorship' | 'workshop' | 'course';
  pointsPrice: number;
  duration?: number;
  maxStudents?: number;
  currentStudents?: number;
  status: 'active' | 'inactive' | 'sold_out';
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface MarketplacePurchase {
  id?: string;
  _id?: string;
  student: string;
  item: string;
  pointsSpent: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  purchasedAt: string;
  scheduledFor?: string;
  completedAt?: string;
}
