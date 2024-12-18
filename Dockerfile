# Stage 1: Build the TypeScript project
FROM node:18 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Stage 2: Create the Docker image using the built files
FROM node:18.12.1-alpine3.17

# Set the working directory
WORKDIR /app

# Copy only the built files from the previous stage
COPY --from=build /app/dist ./dist
COPY package.json .

# Install only production dependencies
RUN npm install --omit=dev

# Expose the desired port (replace 3000 with your application's port)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
