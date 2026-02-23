import Class from '../models/Class.js';
import axios from 'axios';

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
      Class.find(query)
        .populate('student', 'name grade')
        .sort('-scheduledAt')
        .skip(skip)
        .limit(limit),
      Class.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: classes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      classes
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar aulas', error: error.message });
  }
};

export const getClass = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      teacher: req.user._id
    }).populate('student', 'name grade');

    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }

    res.json({
      success: true,
      class: classData
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar aula', error: error.message });
  }
};

export const createClass = async (req, res) => {
  try {
    const { studentId, ...rest } = req.body;
    const classData = {
      ...rest,
      student: studentId || req.body.student,
      teacher: req.user._id
    };

    const newClass = await Class.create(classData);

    res.status(201).json({
      success: true,
      class: newClass
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar aula', error: error.message });
  }
};

export const updateClass = async (req, res) => {
  try {
    const classData = await Class.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }

    res.json({
      success: true,
      class: classData
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar aula', error: error.message });
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
    res.status(500).json({ message: 'Erro ao gerar resumo com IA', error: error.message });
  }
};

export const startClass = async (req, res) => {
  try {
    const classData = await Class.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    );

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada.' });
    }

    // Notificar via Socket.IO se disponível
    const io = req.app.get('io');
    if (io) {
      io.emit('class-started', { classId: req.params.id, class: classData });
    }

    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao iniciar aula', error: error.message });
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
    await classData.save();

    // Notificar via Socket.IO se disponível
    const io = req.app.get('io');
    if (io) {
      io.emit('class-ended', { classId: req.params.id });
    }

    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao encerrar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao deletar aula', error: error.message });
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
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};
