import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'pronunciation_master', // 10 tests with >90% score
      'pronunciation_expert', // 50 tests completed
      'streak_warrior', // 7-day streak
      'streak_champion', // 30-day streak
      'game_winner', // Won 5 games
      'game_master', // Won 20 games
      'perfect_attendance', // 10 classes attended
      'level_up', // Reached level 5
      'top_scorer', // Top 3 in leaderboard
      'early_bird', // First to complete daily challenge
      'helper', // Helped other students
      'consistent_learner' // Practiced every day for a week
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  points: {
    type: Number,
    default: 0
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
achievementSchema.index({ student: 1, teacher: 1, type: 1 });
achievementSchema.index({ teacher: 1, unlockedAt: -1 });

// Static method to award achievement
achievementSchema.statics.awardAchievement = async function(studentId, teacherId, type, metadata = {}) {
  // Check if already awarded
  const existing = await this.findOne({ student: studentId, teacher: teacherId, type });
  if (existing) {
    return { awarded: false, achievement: existing };
  }

  const achievementConfig = getAchievementConfig(type);
  if (!achievementConfig) {
    throw new Error(`Invalid achievement type: ${type}`);
  }

  const achievement = await this.create({
    student: studentId,
    teacher: teacherId,
    type,
    title: achievementConfig.title,
    description: achievementConfig.description,
    icon: achievementConfig.icon,
    points: achievementConfig.points,
    metadata
  });

  // Update student points
  const Student = mongoose.model('Student');
  await Student.findByIdAndUpdate(studentId, {
    $inc: { points: achievementConfig.points }
  });

  return { awarded: true, achievement };
};

// Static method to check and award achievements based on activity
achievementSchema.statics.checkAndAwardAchievements = async function(studentId, teacherId, activityType, activityData = {}) {
  const Student = mongoose.model('Student');
  const student = await Student.findById(studentId);

  if (!student) return [];

  const awarded = [];

  // Check streak achievements
  if (student.streak >= 7) {
    const result = await this.awardAchievement(studentId, teacherId, 'streak_warrior', { streak: student.streak });
    if (result.awarded) awarded.push(result.achievement);
  }

  if (student.streak >= 30) {
    const result = await this.awardAchievement(studentId, teacherId, 'streak_champion', { streak: student.streak });
    if (result.awarded) awarded.push(result.achievement);
  }

  // Check level achievements
  if ((student.level || 0) >= 5) {
    const result = await this.awardAchievement(studentId, teacherId, 'level_up', { level: student.level });
    if (result.awarded) awarded.push(result.achievement);
  }

  // Check pronunciation achievements
  if (activityType === 'pronunciation_test') {
    const PronunciationTest = mongoose.model('PronunciationTest');
    const tests = await PronunciationTest.find({ student: studentId, teacher: teacherId });

    if (tests.length >= 10) {
      const highScoreTests = tests.filter(t => t.pronunciationScore >= 0.90);
      if (highScoreTests.length >= 10) {
        const result = await this.awardAchievement(studentId, teacherId, 'pronunciation_master', { count: highScoreTests.length });
        if (result.awarded) awarded.push(result.achievement);
      }
    }

    if (tests.length >= 50) {
      const result = await this.awardAchievement(studentId, teacherId, 'pronunciation_expert', { count: tests.length });
      if (result.awarded) awarded.push(result.achievement);
    }
  }

  // Check game achievements
  if (activityType === 'game_won') {
    const HangmanGame = mongoose.model('HangmanGame');
    const wonGames = await HangmanGame.countDocuments({
      teacher: teacherId,
      status: 'won',
      'players.studentId': studentId
    });

    if (wonGames >= 5) {
      const result = await this.awardAchievement(studentId, teacherId, 'game_winner', { wins: wonGames });
      if (result.awarded) awarded.push(result.achievement);
    }

    if (wonGames >= 20) {
      const result = await this.awardAchievement(studentId, teacherId, 'game_master', { wins: wonGames });
      if (result.awarded) awarded.push(result.achievement);
    }
  }

  // Check attendance achievements
  if (activityType === 'class_attended') {
    const Class = mongoose.model('Class');
    const attendedClasses = await Class.countDocuments({
      student: studentId,
      teacher: teacherId,
      attendance: 'present'
    });

    if (attendedClasses >= 10) {
      const result = await this.awardAchievement(studentId, teacherId, 'perfect_attendance', { count: attendedClasses });
      if (result.awarded) awarded.push(result.achievement);
    }
  }

  return awarded;
};

function getAchievementConfig(type) {
  const configs = {
    pronunciation_master: {
      title: 'Pronunciation Master',
      description: 'Achieved 90%+ score on 10 pronunciation tests',
      icon: '🎯',
      points: 100
    },
    pronunciation_expert: {
      title: 'Pronunciation Expert',
      description: 'Completed 50 pronunciation tests',
      icon: '🗣️',
      points: 200
    },
    streak_warrior: {
      title: 'Streak Warrior',
      description: 'Maintained a 7-day practice streak',
      icon: '🔥',
      points: 50
    },
    streak_champion: {
      title: 'Streak Champion',
      description: 'Maintained a 30-day practice streak',
      icon: '👑',
      points: 250
    },
    game_winner: {
      title: 'Game Winner',
      description: 'Won 5 games',
      icon: '🎮',
      points: 50
    },
    game_master: {
      title: 'Game Master',
      description: 'Won 20 games',
      icon: '🏅',
      points: 150
    },
    perfect_attendance: {
      title: 'Perfect Attendance',
      description: 'Attended 10 classes',
      icon: '📚',
      points: 75
    },
    level_up: {
      title: 'Level 5 Reached',
      description: 'Reached level 5',
      icon: '⭐',
      points: 100
    },
    top_scorer: {
      title: 'Top Scorer',
      description: 'Ranked in top 3 on leaderboard',
      icon: '🥇',
      points: 150
    },
    early_bird: {
      title: 'Early Bird',
      description: 'First to complete daily challenge',
      icon: '🌅',
      points: 25
    },
    helper: {
      title: 'Helpful Friend',
      description: 'Helped other students',
      icon: '🤝',
      points: 50
    },
    consistent_learner: {
      title: 'Consistent Learner',
      description: 'Practiced every day for a week',
      icon: '💪',
      points: 75
    }
  };

  return configs[type];
}

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
