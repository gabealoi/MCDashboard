# Use the official Node.js image from the Docker Hub as a base image
FROM node:20

# Install Docker
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    lsb-release \
    sudo \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && rm get-docker.sh

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) for dependency installation
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code into the container
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port that the app will run on
EXPOSE 3000

# Command to run the Next.js app
CMD ["npm", "start"]
