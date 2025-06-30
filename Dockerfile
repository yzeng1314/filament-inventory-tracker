# Use Node.js LTS version
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S filament -u 1001

# Change ownership of app directory
RUN chown -R filament:nodejs /app
USER filament

# Start the application
CMD ["npm", "start"]
