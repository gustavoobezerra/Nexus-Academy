import Class from '../models/Class.js';
import Student from '../models/Student.js';
import axios from 'axios';
import emailService from '../services/emailService.js';

const populateClass = (query) => query.populate('student', 'name grade');

const serializeClass = (classData) => {
  const plainClass = typeof classData.toObject === 'function'
    ? classData.toObject()
    : classData;
  const populatedStudent = plainClass.student && typeof plainClass.student === 'object'
    ? plainClass.student
    : null;

  return {
    ...plainClass,
    id: plainClass._id?.toString?.() || plainClass.id,
    studentId: populatedStudent?._id?.toString?.() || plainClass.student?._id?.toString?.() || plainClass.student?.toString?.() || plainClass.studentId,
    studentName: plainClass.studentName || populatedStudent?.name || '',
    grade: plainClass.grade || populatedStudent?.grade || ''
  };
};

const buildPortalLiveClassLink = (classData, teacherName = 'Professor') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const classId = classData._id?.toString?.() || classData.id;
  const query = new URLSearchParams({
    classId: String(classId || ''),
    className: classData.title || 'Aula ao vivo',
    teacherName
  });

  return `${frontendUrl.replace(/\/+$/, '')}/portal/live-class?${query.toString()}`;
};

export const getClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { teacher: req.user._id };

    // Aplicar filtros opcionais
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.studentId) {
      query.student = req.query.studentId;
    }

    const [classes, total] = await Promise.all([
      populateClass(
        Class.find(query)
          .sort({ scheduledAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      Class.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: classes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      classes: classes.map(serializeClass)
    });
  } catch (error) {
    console.error('Erro ao buscar aulas:', error);
    res.status(500).json({ message: 'Erro ao buscar aulas' });
  }
};

export const getClass = async (req, res) => {
  try {
    const classData = await populateClass(Class.findOne({
      _id: req.params.id,
      teacher: req.user._id
    }));

    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }

    res.json({
      success: true,
      class: serializeClass(classData)
    });
  } catch (error) {
    console.error('Erro ao buscar aula:', error);
    res.status(500).json({ message: 'Erro ao buscar aula' });
  }
};

export const createClass = async (req, res) => {
  try {
    const { studentId, ...rest } = req.body;
    const studentRef = studentId || req.body.student;
    const normalizedTitle = String(rest.title || '').trim();
    const normalizedSubject = String(rest.subject || '').trim();

    if (!studentRef) {
      return res.status(400).json({ success: false, message: 'Aluno é obrigatório.' });
    }

    if (!normalizedTitle) {
      return res.status(400).json({ success: false, message: 'Título da aula é obrigatório.' });
    }

    if (!normalizedSubject) {
      return res.status(400).json({ success: false, message: 'Matéria da aula é obrigatória.' });
    }

    const student = await Student.findOne({
      _id: studentRef,
      teacher: req.user._id,
      active: true
    }).select('name grade');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }

    const classData = {
      ...rest,
      title: normalizedTitle,
      subject: normalizedSubject,
      student: student._id,
      teacher: req.user._id,
      studentName: student.name,
      grade: rest.grade || student.grade,
      scheduledAt: rest.scheduledAt ? new Date(rest.scheduledAt) : rest.scheduledAt
    };

    const newClass = await Class.create(classData);
    const populatedClass = await populateClass(Class.findById(newClass._id));

    res.status(201).json({
      success: true,
      class: serializeClass(populatedClass)
    });
  } catch (error) {
    console.error('Erro ao criar aula:', error);
    res.status(500).json({ message: 'Erro ao criar aula' });
  }
};

export const updateClass = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'scheduledAt', 'duration', 'status', 'student', 'subject', 'notes', 'materials', 'homework', 'grade', 'topic'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (req.body.studentId !== undefined) {
      updateData.student = req.body.studentId;
    }

    if (updateData.title !== undefined) {
      updateData.title = String(updateData.title || '').trim();
      if (!updateData.title) {
        return res.status(400).json({ success: false, message: 'Título da aula é obrigatório.' });
      }
    }

    if (updateData.subject !== undefined) {
      updateData.subject = String(updateData.subject || '').trim();
      if (!updateData.subject) {
        return res.status(400).json({ success: false, message: 'Matéria da aula é obrigatória.' });
      }
    }

    if (updateData.student) {
      const student = await Student.findOne({
        _id: updateData.student,
        teacher: req.user._id,
        active: true
      }).select('name grade');

      if (!student) {
        return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
      }

      updateData.student = student._id;
      updateData.studentName = student.name;
      updateData.grade = updateData.grade || student.grade;
    }

    if (updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }

    const classData = await populateClass(Class.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ));

    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }

    res.json({
      success: true,
      class: serializeClass(classData)
    });
  } catch (error) {
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ message: 'Erro ao atualizar aula' });
  }
};

export const generateAISummary = async (req, res) => {
  try {
    const { transcript } = req.body;
    const classId = req.params.id;

    const classData = await Class.findOne({
      _id: classId,
      teacher: req.user._id
    });

    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

    const response = await axios.post(`${AI_SERVICE_URL}/api/generate-summary`, {
      transcript: transcript || classData.transcript
    });

    classData.aiSummary = response.data.result;
    classData.transcript = transcript || classData.transcript;
    await classData.save();

    res.json({
      success: true,
      aiSummary: response.data.result
    });
  } catch (error) {
    console.error('Erro ao gerar resumo com IA:', error);
    res.status(500).json({ message: 'Erro ao gerar resumo com IA' });
  }
};

export const startClass = async (req, res) => {
  try {
    const classData = await populateClass(Class.findOne({
      _id: req.params.id,
      teacher: req.user._id
    }));

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
    }

    classData.meetingLink = buildPortalLiveClassLink(classData, req.user?.name || 'Professor');
    await classData.startClass();

    // Notificar via Socket.IO se disponível
    const io = req.app.get('io');
    if (io) {
      io.emit('class-started', { classId: req.params.id, class: serializeClass(classData) });
    }

    res.json({ success: true, class: serializeClass(classData) });
  } catch (error) {
    console.error('Erro ao iniciar aula:', error);
    res.status(500).json({ success: false, message: 'Erro ao iniciar aula' });
  }
};

export const endClass = async (req, res) => {
  try {
    const endedAt = new Date();

    const classData = await Class.findOne({ _id: req.params.id, teacher: req.user._id });

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
    }

    const startedAt = classData.startedAt || classData.scheduledAt || endedAt;
    const actualDuration = Math.round((endedAt - new Date(startedAt)) / 1000 / 60); // minutos

    classData.status = 'completed';
    classData.endedAt = endedAt;
    classData.actualDuration = actualDuration > 0 ? actualDuration : classData.duration;
    classData.isLive = false;
    await classData.save();
    await classData.populate('student', 'name grade');

    // Notificar via Socket.IO se disponível
    const io = req.app.get('io');
    if (io) {
      io.emit('class-ended', { classId: req.params.id });
    }

    res.json({ success: true, class: serializeClass(classData) });
  } catch (error) {
    console.error('Erro ao encerrar aula:', error);
    res.status(500).json({ success: false, message: 'Erro ao encerrar aula' });
  }
};

export const deleteClass = async (req, res) => {
  try {
    const classData = await Class.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
    }

    res.json({ success: true, message: 'Aula removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar aula:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar aula' });
  }
};

export const sendClassSummary = async (req, res) => {
  try {
    const { parentEmail, studentName, summary, keyPoints, homework, className } = req.body;

    const classData = await Class.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
    }

    if (!parentEmail) {
      return res.status(400).json({ success: false, message: 'Email do responsável não informado.' });
    }

    const result = await emailService.sendClassSummary(parentEmail, {
      studentName: studentName || 'Aluno',
      className: className || classData.title,
      summary: summary || '',
      topics: Array.isArray(keyPoints) ? keyPoints : [],
      homework: Array.isArray(homework) ? homework.join('\n') : (homework || '')
    });

    res.json({ success: true, message: 'Resumo enviado com sucesso!', email: result });
  } catch (error) {
    console.error('Erro ao enviar resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar resumo.' });
  }
};

export const getClassStats = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalClasses = await Class.countDocuments({
      teacher: teacherId
    });

    const upcomingClasses = await Class.countDocuments({
      teacher: teacherId,
      scheduledAt: { $gte: today }
    });

    const completedClasses = await Class.countDocuments({
      teacher: teacherId,
      status: 'completed'
    });

    res.json({
      success: true,
      stats: {
        totalClasses,
        upcomingClasses,
        completedClasses
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de aulas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
};
