# Use Node 20 to satisfy modern package requirements
FROM node:20-slim

WORKDIR /app

# Step 1: Copy package files. 
# Note: We use ./ because the Build Context should be set to the backend folder.
COPY package*.json ./

RUN npm install

# Step 2: Copy everything from the current directory (src/backend) into /app
COPY . .

# Step 3: Ensure we run the right file
EXPOSE 8080
CMD ["node", "server.minimal.js"]