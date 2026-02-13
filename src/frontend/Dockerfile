# Stage 1: Build frontend
FROM node:20-slim AS frontend-build

WORKDIR /app

# Copy only the frontend source
COPY src/app ./app
COPY src/frontend ./frontend
COPY package*.json ./

# Install dependencies
RUN npm install

# Build frontend
WORKDIR /app/app
RUN npm run build

# Stage 2: Build backend + serve frontend
FROM node:20-slim AS final

WORKDIR /app

# Copy backend + package.json
COPY src/backend ./backend
COPY package*.json ./

# Copy frontend build from previous stage
COPY ..

# Install backend dependencies
RUN npm install --omit=dev

# Set environment variables (you can override in Cloud Run)
ENV _PORT=8080

# Expose port
EXPOSE 8080

# Start backend
WORKDIR /app/backend
CMD ["node", "server.js"]
