FROM node:current-alpine3.21
WORKDIR /app
COPY package.json ./
RUN npm install
# Run the application as a non-root user.
COPY . .
EXPOSE 3000
CMD ["npm", "start"]