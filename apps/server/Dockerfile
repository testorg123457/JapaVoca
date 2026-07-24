FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic 은 DB에 접속하지 않지만 settings import 에 DATABASE_URL/SECRET_KEY 가
# 필요하다. 빌드 단계 전용 더미 값을 준다(런타임 값은 Cloud Run 이 주입).
RUN DATABASE_URL="postgres://u:p@localhost:5432/db" \
    SECRET_KEY="build-time-dummy" \
    python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "60"]
