# ---------- Build Stage ----------
FROM node:20-slim AS build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

RUN npm install

# Copy frontend source ONLY
COPY src/frontend ./src/frontend
COPY vite.config.ts ./

# Build frontend
RUN npm run build


# ---------- Production Stage ----------
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
