FROM node:22-bookworm

# Install LibreOffice and Poppler-Utils for PPTX -> PDF -> JPG conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy frontend and install dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/

# Declare Render environment variables as build args so Vite can see them!
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN cd frontend && npm run build

# Set permissions for the bash script
RUN chmod +x backend/convert.sh

EXPOSE 5000

CMD ["node", "backend/server.js"]
