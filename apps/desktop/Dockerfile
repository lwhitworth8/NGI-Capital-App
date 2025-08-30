FROM node:18-alpine

WORKDIR /app

# Build-time configuration for backend origin
ARG NEXT_PUBLIC_API_URL
ARG BACKEND_ORIGIN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV BACKEND_ORIGIN=${BACKEND_ORIGIN}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy app files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3001

# Start the app
CMD ["npm", "start"]
