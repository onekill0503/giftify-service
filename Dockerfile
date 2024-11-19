# Use the Bun image as the base image
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy the lock and package file
COPY bun.lockb .

# Install dependencies
RUN bun install --frozen-lockfile

# Copy your source code
COPY . ./

# Expose port 3000
EXPOSE 3000

# Run the application
CMD ["bun", "index.ts"]