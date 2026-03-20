import AppWithRouter from './AppWithRouter';

/**
 * Compat wrapper para imports legados.
 *
 * O shell ativo do produto vive em `AppWithRouter`. Manter este arquivo como
 * alias evita drift arquitetural sem quebrar imports antigos que ainda esperem
 * `App.tsx` como ponto de entrada simbólico.
 */
export default AppWithRouter;
