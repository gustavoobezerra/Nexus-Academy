import { studentsAPI } from '../lib/api';
import type { Aluno } from '../types';

type StudentsPayload = {
  students?: Aluno[];
  data?: { students?: Aluno[] };
};

type StudentPayload = {
  student?: Aluno;
};

function normalizeStudents(payload: unknown): Aluno[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as Aluno[];
  }

  const typed = payload as StudentsPayload;
  if (Array.isArray(typed.students)) {
    return typed.students;
  }

  if (typed.data && Array.isArray(typed.data.students)) {
    return typed.data.students;
  }

  return [];
}

function extractStudent(payload: unknown, fallback: Partial<Aluno>): Aluno {
  if (payload && typeof payload === 'object' && 'student' in payload) {
    const { student } = payload as StudentPayload;
    if (student) {
      return student;
    }
  }

  return payload as Aluno || (fallback as Aluno);
}

export default function useStudents() {
  const getAll = async (): Promise<Aluno[]> => {
    try {
      const response = await studentsAPI.getAll();
      return normalizeStudents(response);
    } catch {
      return [];
    }
  };

  const create = async (payload: Partial<Aluno>): Promise<Aluno> => {
    try {
      const response = await studentsAPI.create(payload);
      return extractStudent(response, payload);
    } catch {
      throw new Error('Erro ao criar aluno');
    }
  };

  const remove = async (id: string): Promise<Aluno[]> => {
    try {
      await studentsAPI.delete(id);
      return getAll();
    } catch {
      throw new Error('Erro ao remover aluno');
    }
  };

  return { getAll, create, remove };
}
