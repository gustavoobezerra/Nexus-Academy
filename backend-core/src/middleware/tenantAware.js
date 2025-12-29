/**
 * Plugin Mongoose Tenant-Aware
 * 
 * Este plugin automatiza o isolamento de dados multi-tenant injetando
 * automaticamente o filtro { teacher: teacherId } em todas as queries
 * de modelos que possuem o campo 'teacher'.
 * 
 * Isso elimina o risco de erro humano e garante que cada professor
 * só acesse dados de seus próprios alunos.
 */

import { AsyncLocalStorage } from 'async_hooks';

// Armazenamento de contexto por requisição
export const tenantContext = new AsyncLocalStorage();

/**
 * Middleware Express para capturar o teacherId e armazenar no contexto
 * Deve ser usado APÓS o middleware de autenticação
 */
export const tenantContextMiddleware = (req, res, next) => {
  const teacherId = req.teacherId || req.user?._id;
  
  if (teacherId) {
    // Armazena o teacherId no contexto da requisição
    tenantContext.run({ teacherId: teacherId.toString() }, () => {
      next();
    });
  } else {
    next();
  }
};

/**
 * Plugin Mongoose que injeta automaticamente o filtro de tenant
 * 
 * Uso:
 * import { tenantAwarePlugin } from './middleware/tenantAware.js';
 * studentSchema.plugin(tenantAwarePlugin);
 */
export const tenantAwarePlugin = (schema, options = {}) => {
  // Verificar se o schema tem o campo 'teacher'
  if (!schema.paths.teacher) {
    // Se não tem campo teacher, não aplicar o plugin
    return;
  }

  const tenantField = options.tenantField || 'teacher';

  // Interceptar queries de leitura
  const readMethods = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'count', 'countDocuments'];
  
  readMethods.forEach(method => {
    schema.pre(method, function() {
      const context = tenantContext.getStore();
      
      if (context && context.teacherId) {
        // Verificar se já não tem o filtro de teacher
        const currentFilter = this.getFilter();
        
        if (!currentFilter[tenantField]) {
          this.where({ [tenantField]: context.teacherId });
        }
      }
    });
  });

  // Interceptar queries de escrita
  schema.pre('save', function(next) {
    const context = tenantContext.getStore();
    
    // Se é um documento novo e não tem teacher definido, injetar do contexto
    if (this.isNew && context && context.teacherId && !this[tenantField]) {
      this[tenantField] = context.teacherId;
    }
    
    next();
  });

  // Interceptar updateMany e deleteMany
  const writeMethods = ['updateMany', 'deleteMany'];
  
  writeMethods.forEach(method => {
    schema.pre(method, function() {
      const context = tenantContext.getStore();
      
      if (context && context.teacherId) {
        const currentFilter = this.getFilter();
        
        if (!currentFilter[tenantField]) {
          this.where({ [tenantField]: context.teacherId });
        }
      }
    });
  });

  // Interceptar aggregate
  schema.pre('aggregate', function() {
    const context = tenantContext.getStore();
    
    if (context && context.teacherId) {
      // Adicionar $match no início do pipeline
      this.pipeline().unshift({
        $match: { [tenantField]: context.teacherId }
      });
    }
  });
};

/**
 * Função auxiliar para obter o teacherId do contexto atual
 */
export const getCurrentTeacherId = () => {
  const context = tenantContext.getStore();
  return context?.teacherId || null;
};

/**
 * Função para executar código sem o filtro de tenant (usar com MUITO cuidado)
 * Útil para operações administrativas ou de sistema
 */
export const withoutTenantFilter = (callback) => {
  return tenantContext.run({}, callback);
};

export default {
  tenantAwarePlugin,
  tenantContextMiddleware,
  getCurrentTeacherId,
  withoutTenantFilter
};
