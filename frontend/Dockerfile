FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps --silent

# Copy the rest of the application source
COPY . .

# Expose the ports used by Expo for the web dev server and devtools
EXPOSE 19006 19002

# Start Expo in web mode
CMD ["npm", "run", "web"] 