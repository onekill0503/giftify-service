# Use the Bun image as the base image
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy your source code
COPY . ./

# Install dependencies
RUN bun install --frozen-lockfile

# Expose port 3000
EXPOSE 3000

# Run the application
CMD ["bun", "src/index.ts"]