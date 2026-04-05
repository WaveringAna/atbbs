FROM node:22-slim AS frontend

WORKDIR /app
COPY package.json ./
RUN npm install
COPY web/static/input.css web/static/input.css
COPY web/templates/ web/templates/
COPY web/ts/ web/ts/

RUN npx @tailwindcss/cli -i web/static/input.css -o web/static/style.css --minify
RUN npx esbuild web/ts/main.ts --bundle --outfile=web/static/app.js --minify


FROM python:3.14-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy source
COPY pyproject.toml uv.lock README.md ./
COPY cli/ cli/
COPY core/ core/
COPY tui/ tui/
COPY web/ web/

# Copy built frontend assets
COPY --from=frontend /app/web/static/style.css web/static/style.css
COPY --from=frontend /app/web/static/app.js web/static/app.js

# Remove TS source
RUN rm -rf web/ts

# Install Python package
RUN uv sync --frozen --no-dev

RUN mkdir -p /data

ENV ATBBS_DATA_DIR=/data
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

CMD ["uv", "run", "atbbs", "serve", "--host", "0.0.0.0", "--port", "8000", "--workers", "3", "--data-dir", "/data"]
