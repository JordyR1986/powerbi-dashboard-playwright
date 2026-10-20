# Same Playwright version as package.json, so browsers and snapshots match local and CI runs.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

ENV CI=true

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

CMD ["npx", "playwright", "test"]
