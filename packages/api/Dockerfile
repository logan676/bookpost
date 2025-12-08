# Production Dockerfile for BookPost API
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for tsx)
RUN npm ci

# Copy source
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server using tsx (TypeScript execution)
CMD ["npx", "tsx", "src/index.ts"]
