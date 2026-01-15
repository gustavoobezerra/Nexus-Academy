/**
 * Teaching Assistant Service
 * Provides AI-powered insights and suggestions for teachers
 * Based on student performance data and learning patterns
 */

import Student from '../models/Student.js';
import PronunciationTest from '../models/PronunciationTest.js';
import Class from '../models/Class.js';

/**
 * Generate teaching suggestions based on student performance
 * Rule-based MVP - can be enhanced with OpenAI later
 */
export async function generateTeachingSuggestions(teacherId, studentId = null) {
  try {
    const suggestions = [];

    // Query for specific student or all students
    const studentQuery = studentId
      ? { _id: studentId, teacher: teacherId }
      : { teacher: teacherId };

    const students = await Student.find(studentQuery)
      .select('name points level streak gamification')
      .lean();

    if (students.length === 0) {
      return {
        success: true,
        suggestions: [{
          type: 'info',
          priority: 'low',
          title: 'No Students Yet',
          description: 'Start by adding students to get personalized teaching insights.',
          actions: []
        }]
      };
    }

    // Analyze pronunciation performance
    const pronunciationQuery = studentId
      ? { teacher: teacherId, student: studentId }
      : { teacher: teacherId };

    const pronunciationTests = await PronunciationTest.find(pronunciationQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Analyze recent class attendance
    const recentClasses = await Class.find({
      teacher: teacherId,
      scheduledAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
      .select('student attendance status')
      .lean();

    // Generate suggestions based on data
    suggestions.push(...analyzeEngagement(students, recentClasses));
    suggestions.push(...analyzePronunciation(pronunciationTests));
    suggestions.push(...analyzeGamification(students));
    suggestions.push(...analyzeAttendance(recentClasses));

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      success: true,
      suggestions: suggestions.slice(0, 10), // Top 10 suggestions
      metadata: {
        totalStudents: students.length,
        totalTests: pronunciationTests.length,
        totalClasses: recentClasses.length,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating teaching suggestions:', error);
    throw error;
  }
}

/**
 * Analyze student engagement patterns
 */
function analyzeEngagement(students, recentClasses) {
  const suggestions = [];

  // Low engagement students (low points)
  const lowEngagement = students.filter(s => (s.points || 0) < 50);
  if (lowEngagement.length > 0) {
    suggestions.push({
      type: 'engagement',
      priority: 'high',
      title: `${lowEngagement.length} Student(s) Need Motivation Boost`,
      description: `Students with low points may benefit from interactive activities and encouragement.`,
      students: lowEngagement.map(s => s.name),
      actions: [
        'Start a voice game session to increase engagement',
        'Assign fun pronunciation challenges',
        'Send personalized encouragement message'
      ]
    });
  }

  // Streak breakers (had streak but lost it)
  const lostStreak = students.filter(s => {
    const streak = s.gamification?.streak || s.streak || 0;
    return streak === 0 && (s.points || 0) > 100;
  });

  if (lostStreak.length > 0) {
    suggestions.push({
      type: 'retention',
      priority: 'medium',
      title: `${lostStreak.length} Student(s) Lost Their Streak`,
      description: 'Re-engage students who were previously active but have lost momentum.',
      students: lostStreak.map(s => s.name),
      actions: [
        'Send reminder about daily practice',
        'Offer bonus points for completing a task today',
        'Schedule a live session to reconnect'
      ]
    });
  }

  return suggestions;
}

/**
 * Analyze pronunciation test performance
 */
function analyzePronunciation(tests) {
  const suggestions = [];

  if (tests.length === 0) {
    return [{
      type: 'pronunciation',
      priority: 'low',
      title: 'Enable Pronunciation Practice',
      description: 'Guide students to use the pronunciation testing feature for skill development.',
      actions: [
        'Share pronunciation test link with students',
        'Create custom phrases for practice',
        'Schedule a pronunciation-focused session'
      ]
    }];
  }

  // Group by student
  const byStudent = tests.reduce((acc, test) => {
    const studentId = test.student.toString();
    if (!acc[studentId]) acc[studentId] = [];
    acc[studentId].push(test);
    return acc;
  }, {});

  // Find students struggling with pronunciation
  const struggling = [];
  for (const [studentId, studentTests] of Object.entries(byStudent)) {
    const recent = studentTests.slice(0, 5);
    const avgScore = recent.reduce((sum, t) => sum + (t.pronunciationScore || 0), 0) / recent.length;

    if (avgScore < 0.70 && recent.length >= 3) {
      struggling.push({
        studentId,
        avgScore,
        testCount: recent.length
      });
    }
  }

  if (struggling.length > 0) {
    suggestions.push({
      type: 'pronunciation',
      priority: 'high',
      title: `${struggling.length} Student(s) Struggling with Pronunciation`,
      description: 'These students consistently score below 70% on pronunciation tests.',
      actions: [
        'Schedule one-on-one pronunciation coaching',
        'Assign beginner-level phrases for practice',
        'Use syllable breakdown exercises',
        'Review common pronunciation errors'
      ],
      metadata: {
        avgScores: struggling.map(s => Math.round(s.avgScore * 100))
      }
    });
  }

  // Find students excelling (potential to advance)
  const excelling = [];
  for (const [studentId, studentTests] of Object.entries(byStudent)) {
    const recent = studentTests.slice(0, 5);
    const avgScore = recent.reduce((sum, t) => sum + (t.pronunciationScore || 0), 0) / recent.length;

    if (avgScore >= 0.90 && recent.length >= 3) {
      excelling.push({ studentId, avgScore });
    }
  }

  if (excelling.length > 0) {
    suggestions.push({
      type: 'advancement',
      priority: 'medium',
      title: `${excelling.length} Student(s) Ready for Advanced Material`,
      description: 'These students excel at current level - challenge them with harder content.',
      actions: [
        'Increase difficulty level',
        'Introduce complex phrases and idioms',
        'Assign leadership role in group activities'
      ]
    });
  }

  return suggestions;
}

/**
 * Analyze gamification metrics
 */
function analyzeGamification(students) {
  const suggestions = [];

  const highPerformers = students.filter(s => (s.level || 0) >= 5);
  if (highPerformers.length > 0) {
    suggestions.push({
      type: 'gamification',
      priority: 'low',
      title: `${highPerformers.length} Student(s) Reached High Levels`,
      description: 'Celebrate achievements and maintain motivation with new challenges.',
      students: highPerformers.map(s => s.name),
      actions: [
        'Award special badges',
        'Feature top students on leaderboard',
        'Create exclusive advanced challenges'
      ]
    });
  }

  return suggestions;
}

/**
 * Analyze class attendance patterns
 */
function analyzeAttendance(recentClasses) {
  const suggestions = [];

  const totalClasses = recentClasses.length;
  if (totalClasses === 0) {
    return suggestions;
  }

  const completedClasses = recentClasses.filter(c => c.status === 'completed');
  const cancelledClasses = recentClasses.filter(c => c.status === 'cancelled');

  const cancellationRate = cancelledClasses.length / totalClasses;

  if (cancellationRate > 0.20) {
    suggestions.push({
      type: 'scheduling',
      priority: 'medium',
      title: 'High Class Cancellation Rate',
      description: `${Math.round(cancellationRate * 100)}% of recent classes were cancelled. Review scheduling conflicts.`,
      actions: [
        'Survey students for preferred times',
        'Set up recurring schedule',
        'Enable automatic rescheduling'
      ]
    });
  }

  // Check attendance trends
  const attendanceData = completedClasses.filter(c => c.attendance !== undefined);
  if (attendanceData.length > 5) {
    const avgAttendance = attendanceData.reduce((sum, c) =>
      sum + (c.attendance === 'present' ? 1 : 0), 0) / attendanceData.length;

    if (avgAttendance < 0.80) {
      suggestions.push({
        type: 'attendance',
        priority: 'high',
        title: 'Low Attendance Rate Detected',
        description: `Only ${Math.round(avgAttendance * 100)}% attendance in recent classes.`,
        actions: [
          'Send class reminders 1 day before',
          'Make classes more interactive',
          'Check in with frequently absent students'
        ]
      });
    }
  }

  return suggestions;
}

/**
 * Generate student-specific report
 */
export async function generateStudentReport(teacherId, studentId) {
  try {
    const student = await Student.findOne({
      _id: studentId,
      teacher: teacherId
    }).lean();

    if (!student) {
      throw new Error('Student not found');
    }

    // Get pronunciation history
    const pronunciationTests = await PronunciationTest.find({
      teacher: teacherId,
      student: studentId
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get class history
    const classes = await Class.find({
      teacher: teacherId,
      student: studentId,
      scheduledAt: { $lte: new Date() }
    })
      .sort({ scheduledAt: -1 })
      .limit(20)
      .lean();

    // Calculate metrics
    const totalClasses = classes.length;
    const attendedClasses = classes.filter(c => c.attendance === 'present').length;
    const attendanceRate = totalClasses > 0 ? attendedClasses / totalClasses : 0;

    const avgPronunciation = pronunciationTests.length > 0
      ? pronunciationTests.reduce((sum, t) => sum + (t.pronunciationScore || 0), 0) / pronunciationTests.length
      : 0;

    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    if (avgPronunciation >= 0.85) {
      strengths.push('Excellent pronunciation skills');
    } else if (avgPronunciation < 0.70) {
      weaknesses.push('Pronunciation needs improvement');
    }

    if (attendanceRate >= 0.90) {
      strengths.push('Consistent attendance');
    } else if (attendanceRate < 0.70) {
      weaknesses.push('Irregular attendance');
    }

    if ((student.streak || 0) >= 7) {
      strengths.push(`${student.streak}-day practice streak`);
    }

    if ((student.points || 0) >= 500) {
      strengths.push('Highly engaged learner');
    } else if ((student.points || 0) < 50) {
      weaknesses.push('Low engagement level');
    }

    return {
      success: true,
      report: {
        student: {
          name: student.name,
          level: student.level || 1,
          points: student.points || 0,
          streak: student.streak || 0
        },
        metrics: {
          totalClasses,
          attendedClasses,
          attendanceRate: Math.round(attendanceRate * 100),
          totalPronunciationTests: pronunciationTests.length,
          avgPronunciationScore: Math.round(avgPronunciation * 100)
        },
        strengths,
        weaknesses,
        recommendations: generateRecommendations(strengths, weaknesses, student),
        recentActivity: {
          lastClass: classes[0]?.scheduledAt || null,
          lastPronunciationTest: pronunciationTests[0]?.createdAt || null
        }
      }
    };
  } catch (error) {
    console.error('Error generating student report:', error);
    throw error;
  }
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(strengths, weaknesses, student) {
  const recommendations = [];

  if (weaknesses.includes('Pronunciation needs improvement')) {
    recommendations.push({
      area: 'Pronunciation',
      suggestion: 'Schedule focused pronunciation sessions with syllable-level practice',
      priority: 'high'
    });
  }

  if (weaknesses.includes('Irregular attendance')) {
    recommendations.push({
      area: 'Attendance',
      suggestion: 'Set up recurring class schedule and send automated reminders',
      priority: 'high'
    });
  }

  if (weaknesses.includes('Low engagement level')) {
    recommendations.push({
      area: 'Engagement',
      suggestion: 'Introduce voice games and interactive challenges to boost participation',
      priority: 'medium'
    });
  }

  if (strengths.includes('Excellent pronunciation skills')) {
    recommendations.push({
      area: 'Advancement',
      suggestion: 'Student ready for advanced difficulty level and complex phrases',
      priority: 'low'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      area: 'General',
      suggestion: 'Maintain current teaching approach - student shows balanced progress',
      priority: 'low'
    });
  }

  return recommendations;
}

export default {
  generateTeachingSuggestions,
  generateStudentReport
};
