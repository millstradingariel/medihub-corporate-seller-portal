# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy frontend source
COPY src/frontend/app ./app
COPY src/frontend/components ./components
COPY src/frontend/firebase ./firebase
COPY package*.json ./

RUN npm install
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
