/**
 * Serviço de Monitoring e Observabilidade
 * Suporta múltiplos providers: Sentry, LogRocket, ou logging customizado
 */

class MonitoringService {
  constructor() {
    this.providers = {
      sentry: null,
      logrocket: null,
      custom: null
    };
    this.isInitialized = false;
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      dsn: process.env.SENTRY_DSN,
      logRocketAppId: process.env.LOGROCKET_APP_ID,
      enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
      sampleRate: parseFloat(process.env.MONITORING_SAMPLE_RATE || '1.0')
    };
  }

  /**
   * Inicializar serviços de monitoring
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Monitoring already initialized');
      return;
    }

    try {
      // Inicializar Sentry se configurado
      if (this.config.dsn && this.config.enableErrorTracking) {
        await this.initializeSentry();
      }

      // Inicializar LogRocket se configurado
      if (this.config.logRocketAppId) {
        await this.initializeLogRocket();
      }

      // Sempre inicializar logging customizado
      this.initializeCustomLogging();

      this.isInitialized = true;
      console.log('✅ Monitoring service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      // Não falhar a aplicação se monitoring falhar
    }
  }

  /**
   * Inicializar Sentry
   */
  async initializeSentry() {
    try {
      // Dynamic import para não quebrar se Sentry não estiver instalado
      const Sentry = await import('@sentry/node').catch(() => null);
      
      if (!Sentry) {
        console.warn('⚠️ @sentry/node not installed. Install it for error tracking.');
        return;
      }

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        tracesSampleRate: this.config.enablePerformanceMonitoring ? 0.1 : 0,
        profilesSampleRate: this.config.enablePerformanceMonitoring ? 0.1 : 0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: null }),
        ],
        beforeSend(event, hint) {
          // Filtrar eventos sensíveis
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        }
      });

      this.providers.sentry = Sentry;
      console.log('✅ Sentry initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  /**
   * Inicializar LogRocket
   */
  async initializeLogRocket() {
    try {
      // LogRocket é tipicamente inicializado no frontend
      // Aqui apenas registramos que está configurado
      console.log('✅ LogRocket configured (initialize in frontend)');
      this.providers.logrocket = { configured: true };
    } catch (error) {
      console.error('❌ Failed to initialize LogRocket:', error);
    }
  }

  /**
   * Inicializar logging customizado
   */
  initializeCustomLogging() {
    this.providers.custom = {
      logs: [],
      errors: [],
      performance: [],
      maxLogs: 1000
    };
    console.log('✅ Custom logging initialized');
  }

  /**
   * Capturar erro
   */
  captureError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: this.config.environment
    };

    // Sentry
    if (this.providers.sentry) {
      this.providers.sentry.captureException(error, {
        contexts: { custom: context },
        tags: { component: context.component || 'unknown' }
      });
    }

    // Custom logging
    if (this.providers.custom) {
      this.providers.custom.errors.push(errorInfo);
      // Manter apenas últimos N erros
      if (this.providers.custom.errors.length > this.providers.custom.maxLogs) {
        this.providers.custom.errors.shift();
      }
    }

    // Log no console (desenvolvimento)
    if (this.config.environment === 'development') {
      console.error('🔴 Error captured:', errorInfo);
    }
  }

  /**
   * Capturar mensagem
   */
  captureMessage(message, level = 'info', context = {}) {
    const messageInfo = {
      message,
      level,
      context,
      timestamp: new Date().toISOString()
    };

    // Sentry
    if (this.providers.sentry) {
      this.providers.sentry.captureMessage(message, {
        level: this.mapLevelToSentry(level),
        contexts: { custom: context }
      });
    }

    // Custom logging
    if (this.providers.custom) {
      this.providers.custom.logs.push(messageInfo);
      if (this.providers.custom.logs.length > this.providers.custom.maxLogs) {
        this.providers.custom.logs.shift();
      }
    }

    // Log no console
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`📝 ${message}`, context);
  }

  /**
   * Iniciar transação de performance
   */
  startTransaction(name, op = 'http.server') {
    if (!this.config.enablePerformanceMonitoring) {
      return null;
    }

    // Sentry
    if (this.providers.sentry) {
      return this.providers.sentry.startTransaction({
        name,
        op
      });
    }

    // Custom performance tracking
    return {
      name,
      op,
      startTime: Date.now(),
      finish: () => {
        const duration = Date.now() - this.startTime;
        if (this.providers.custom) {
          this.providers.custom.performance.push({
            name,
            duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }

  /**
   * Adicionar breadcrumb
   */
  addBreadcrumb(message, category = 'custom', level = 'info', data = {}) {
    // Sentry
    if (this.providers.sentry) {
      this.providers.sentry.addBreadcrumb({
        message,
        category,
        level: this.mapLevelToSentry(level),
        data,
        timestamp: Date.now() / 1000
      });
    }

    // Custom logging
    if (this.providers.custom) {
      this.providers.custom.logs.push({
        message,
        category,
        level,
        data,
        timestamp: new Date().toISOString(),
        type: 'breadcrumb'
      });
    }
  }

  /**
   * Obter métricas customizadas
   */
  getMetrics() {
    if (!this.providers.custom) {
      return null;
    }

    return {
      totalLogs: this.providers.custom.logs.length,
      totalErrors: this.providers.custom.errors.length,
      totalPerformance: this.providers.custom.performance.length,
      recentErrors: this.providers.custom.errors.slice(-10),
      recentLogs: this.providers.custom.logs.slice(-20),
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  /**
   * Calcular tempo médio de resposta
   */
  calculateAverageResponseTime() {
    if (!this.providers.custom?.performance.length) {
      return 0;
    }

    const times = this.providers.custom.performance
      .slice(-100) // Últimas 100 transações
      .map(p => p.duration);

    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Mapear nível para Sentry
   */
  mapLevelToSentry(level) {
    const mapping = {
      'debug': 'debug',
      'info': 'info',
      'warning': 'warning',
      'error': 'error',
      'fatal': 'fatal'
    };
    return mapping[level] || 'info';
  }

  /**
   * Middleware Express para capturar erros
   */
  errorHandler() {
    return (err, req, res, next) => {
      // Capturar erro
      this.captureError(err, {
        component: 'express',
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Responder
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(this.config.environment === 'development' && { stack: err.stack })
      });
    };
  }

  /**
   * Middleware Express para performance
   */
  performanceMiddleware() {
    return (req, res, next) => {
      if (!this.config.enablePerformanceMonitoring) {
        return next();
      }

      const transaction = this.startTransaction(`${req.method} ${req.path}`, 'http.server');
      
      res.on('finish', () => {
        if (transaction) {
          transaction.setHttpStatus(res.statusCode);
          transaction.finish();
        }
      });

      next();
    };
  }
}

// Singleton
const monitoringService = new MonitoringService();

export default monitoringService;

