# Multi-stage build para otimizar tamanho da imagem
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Estágio final
FROM node:22-alpine

WORKDIR /app

# Copiar dependências do estágio builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar ownership
RUN chown -R nodejs:nodejs /app

# Usar usuário não-root
USER nodejs

# Expor porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicialização
CMD ["node", "src/server-simple.js"]
