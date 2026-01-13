FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN tsc

# Remove devDependencies after build
RUN npm prune --production

# Expose port (Cloud Run uses PORT env variable, default 8080)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production

# Start the server - Cloud Run sets PORT automatically
CMD ["node", "dist/index.js"]
