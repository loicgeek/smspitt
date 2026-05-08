FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY bin/ ./bin/

RUN chmod +x bin/smspitt.js

EXPOSE 2875 2876 2877

ENTRYPOINT ["node", "bin/smspitt.js"]
CMD ["--no-open"]
