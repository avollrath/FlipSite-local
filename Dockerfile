FROM node:24-alpine AS frontend

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html postcss.config.js tailwind.config.js tsconfig*.json vite.config.ts ./
COPY public public
COPY src src
RUN npm run build

FROM python:3.13-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend backend
COPY --from=frontend /app/dist dist

ENV FLIPSITE_DATA_DIR=/data
ENV FLIPSITE_FRONTEND_DIR=/app/dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health')"

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--access-logfile", "-", "backend.app:app"]
