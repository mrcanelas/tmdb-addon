FROM node:14-alpine
ENV PORT=3000
WORKDIR /opt/Stremio/Addon
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
