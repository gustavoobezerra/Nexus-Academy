import { classesAPI } from '../lib/api';
import type { Aula } from '../types';

export default function useClasses() {
  const getAll = async (): Promise<Aula[]> => {
    try {
      const res = await classesAPI.getAll();
      return res.data.classes || [];
    } catch {
      return [];
    }
  };

  const create = async (payload: Partial<Aula>) => {
    return await classesAPI.create(payload);
  };

  return { getAll, create };
}
