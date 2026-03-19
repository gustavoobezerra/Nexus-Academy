import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { aiAPI } from '../lib/api';
import type { TeacherWorkspaceData } from '../types';

const emptyWorkspaceData: TeacherWorkspaceData = {
  provider: {
    provider: 'gemini',
    configured: false,
    available: false,
    mode: 'fallback',
    models: []
  },
  students: [],
  classes: [],
  payments: [],
  activities: [],
  lessonPreparations: [],
  learningSnapshots: [],
  studentGroups: [],
  counts: {
    students: 0,
    classes: 0,
    payments: 0,
    activities: 0,
    lessonPreparations: 0,
    studentGroups: 0
  }
};

/**
 * Camada compartilhada do AI Hub do professor.
 *
 * Centraliza o carregamento dos dados reais usados pelos workspaces de:
 * atividades, insights, agenda inteligente, preparação de aula e grupos.
 */
export const useTeacherWorkspaceData = (enabled: boolean = true) => {
  const [data, setData] = useState<TeacherWorkspaceData>(emptyWorkspaceData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await aiAPI.getWorkspaceData();

      startTransition(() => {
        setData({
          provider: response.provider,
          students: response.students,
          classes: response.classes,
          payments: response.payments,
          activities: response.activities,
          lessonPreparations: response.lessonPreparations,
          learningSnapshots: response.learningSnapshots || [],
          studentGroups: response.studentGroups,
          counts: response.counts
        });
        setError(null);
      });
    } catch (loadError) {
      const nextMessage = loadError instanceof Error
        ? loadError.message
        : 'Erro ao carregar o workspace do professor.';
      setError(nextMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void load(false);
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return useMemo(() => ({
    data,
    loading,
    refreshing,
    error,
    refresh
  }), [data, error, loading, refresh, refreshing]);
};

export default useTeacherWorkspaceData;
