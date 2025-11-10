# Platium Simple Backend - Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
