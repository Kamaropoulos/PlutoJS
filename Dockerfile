FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Copy app source
COPY app ./app
COPY src ./src
COPY server.js ./
COPY api_config* ./


EXPOSE 3000
CMD [ "node", "./server.js" ]