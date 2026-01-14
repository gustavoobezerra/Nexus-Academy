import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const pronunciationPhraseSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phrase: { type: String, required: true, trim: true },
  difficulty: {
    type: String,
    enum: ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'proficient'],
    default: 'intermediate'
  },
  audioUrl: { type: String, trim: true },
  source: { type: String, enum: ['teacher', 'ai'], default: 'teacher' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

pronunciationPhraseSchema.index({ teacher: 1, createdAt: -1 });

pronunciationPhraseSchema.plugin(tenantAwarePlugin);

export default mongoose.model('PronunciationPhrase', pronunciationPhraseSchema);
