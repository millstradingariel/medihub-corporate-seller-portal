# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# FIX: Copy the entire dist folder, not just assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config 
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]