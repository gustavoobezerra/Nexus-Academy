import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { authenticateStudent } from '../middleware/studentAuth.js';
import Achievement from '../models/Achievement.js';
import Student from '../models/Student.js';

const router = express.Router();

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard (teacher view - all students)
 */
router.get('/leaderboard', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const teacherId = req.user._id;

    const students = await Student.find({ teacher: teacherId })
      .select('name points level streak avatar')
      .sort({ points: -1 })
      .limit(parseInt(limit))
      .lean();

    const leaderboard = students.map((student, index) => ({
      rank: index + 1,
      studentId: student._id,
      name: student.name,
      points: student.points || 0,
      level: student.level || 1,
      streak: student.streak || 0,
      avatar: student.avatar
    }));

    return res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

/**
 * GET /api/gamification/student/leaderboard
 * Get leaderboard (student view - anonymized)
 */
router.get('/student/leaderboard', authenticateStudent, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const teacherId = req.teacherId;
    const studentId = req.studentId;

    const students = await Student.find({ teacher: teacherId })
      .select('name points level streak')
      .sort({ points: -1 })
      .limit(parseInt(limit))
      .lean();

    const leaderboard = students.map((student, index) => {
      const isCurrentStudent = student._id.toString() === studentId.toString();
      return {
        rank: index + 1,
        name: isCurrentStudent ? student.name : `Student ${index + 1}`,
        points: student.points || 0,
        level: student.level || 1,
        streak: student.streak || 0,
        isYou: isCurrentStudent
      };
    });

    return res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching student leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

/**
 * GET /api/gamification/achievements/:studentId
 * Get student achievements (teacher view)
 */
router.get('/achievements/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user._id;

    const achievements = await Achievement.find({
      student: studentId,
      teacher: teacherId
    })
      .sort({ unlockedAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching achievements'
    });
  }
});

/**
 * GET /api/gamification/student/achievements
 * Get own achievements (student view)
 */
router.get('/student/achievements', authenticateStudent, async (req, res) => {
  try {
    const studentId = req.studentId;
    const teacherId = req.teacherId;

    const achievements = await Achievement.find({
      student: studentId,
      teacher: teacherId
    })
      .sort({ unlockedAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching student achievements:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching achievements'
    });
  }
});

/**
 * POST /api/gamification/award-points
 * Manually award points to student (teacher only)
 */
router.post('/award-points', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId, points, reason } = req.body;
    const teacherId = req.user._id;

    if (!studentId || !points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and positive points required'
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      teacher: teacherId
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.points = (student.points || 0) + points;
    await student.save();

    return res.json({
      success: true,
      message: `Awarded ${points} points to ${student.name}`,
      data: {
        studentId: student._id,
        totalPoints: student.points,
        awarded: points,
        reason
      }
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    return res.status(500).json({
      success: false,
      message: 'Error awarding points'
    });
  }
});

/**
 * GET /api/gamification/stats
 * Get overall gamification stats (teacher view)
 */
router.get('/stats', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;

    const totalAchievements = await Achievement.countDocuments({ teacher: teacherId });

    const topStudent = await Student.findOne({ teacher: teacherId })
      .sort({ points: -1 })
      .select('name points level')
      .lean();

    const avgPoints = await Student.aggregate([
      { $match: { teacher: teacherId } },
      {
        $group: {
          _id: null,
          avgPoints: { $avg: '$points' },
          avgLevel: { $avg: '$level' },
          avgStreak: { $avg: '$streak' }
        }
      }
    ]);

    const recentAchievements = await Achievement.find({ teacher: teacherId })
      .sort({ unlockedAt: -1 })
      .limit(5)
      .populate('student', 'name')
      .lean();

    return res.json({
      success: true,
      data: {
        totalAchievements,
        topStudent,
        averages: avgPoints[0] || { avgPoints: 0, avgLevel: 1, avgStreak: 0 },
        recentAchievements: recentAchievements.map(a => ({
          type: a.type,
          title: a.title,
          studentName: a.student?.name || 'Unknown',
          unlockedAt: a.unlockedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
});

export default router;
