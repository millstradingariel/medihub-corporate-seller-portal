FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./

RUN npm install

COPY index.html ./

COPY app ./app
COPY components ./components
COPY pages ./pages
COPY services ./services
COPY types ./types
COPY api ./api
COPY auth ./auth
COPY firebase ./firebase

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]