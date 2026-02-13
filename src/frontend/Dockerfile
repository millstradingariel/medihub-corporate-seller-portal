# -------- Build stage --------
FROM node:20-slim AS build

WORKDIR /app

# Copy only frontend
COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend ./

# Build
RUN npm run build

# -------- Production stage --------
FROM nginx:alpine

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
