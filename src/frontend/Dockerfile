FROM node:20-slim AS build

WORKDIR /app

COPY package*.json vite.config.ts ./
COPY app ./app
COPY index.css ./

RUN npm install

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
