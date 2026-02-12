# Use Node 20 to satisfy your package requirements
FROM node:20-slim

# This is where the app lives inside the container
WORKDIR /app

# 1. Copy package files from the root context into /app
COPY app/src/backend/package*.json ./

# 2. Install dependencies
RUN npm install

# 3. Copy EVERYTHING from your backend folder into /app
# This means server.minimal.js will now be at /app/server.minimal.js
COPY **/src/backend/ ./
# 4. Expose the Cloud Run port
EXPOSE 8080

# 5. The Moment of Truth: Run the file
# We use server.minimal.js because that is your filename
CMD ["node", "server.minimal.js"]