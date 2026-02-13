# -------- Build stage --------
FROM node:20-slim AS build

WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./
RUN npm install

# Copy the rest of frontend files
COPY . .

# Build the frontend
RUN npm run build

# -------- Production stage --------
FROM nginx:alpine

# Copy built frontend to nginx
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
