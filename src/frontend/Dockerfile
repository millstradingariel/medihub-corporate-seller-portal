# -------- Build stage --------
FROM node:20-slim AS build

# Set working directory inside container
WORKDIR /app

# Copy only frontend project files
# copy root files first
COPY package*.json vite.config.ts ./
COPY app ./app
COPY index.css ./

# Install dependencies
RUN npm install

# Build frontend
RUN npm run build

# -------- Production stage --------
FROM nginx:alpine

# Copy build output to Nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy your nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
