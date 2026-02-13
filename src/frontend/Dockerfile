# Stage 1: Build frontend
FROM node:20-slim AS build

WORKDIR /app

# Copy frontend source + package.json
COPY package*.json ./
COPY src/app ./app
COPY src/frontend ./frontend

# Install dependencies
RUN npm install

# Build frontend
WORKDIR /app/app
RUN npm run build

# Stage 2: Serve static frontend using nginx
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy build output from previous stage
COPY --from=build /app/app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
