FROM node:16 AS builder

# Create app directory
WORKDIR /app

COPY package.json yarn.lock ./

# Install app dependencies
RUN yarn install

# Compile typescript
COPY . .
RUN yarn run tsc


FROM node:16

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD [ "node", "dist/index.js" ]
