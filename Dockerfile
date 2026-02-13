FROM node:lts-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
# Run the application as a non-root user.
COPY . .
EXPOSE 3000
CMD ["npm", "start"]