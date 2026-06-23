# JapaVoca

## 백엔드 실행 (apps/server)

```bash
cd apps/server
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000
```

## 앱 실행 (apps/mobile, Android)

```bash
cd apps/mobile
npm install
npm start --host 0.0.0.0            # Metro 번들러 (별도 터미널)
npx react-native run-android        # 에뮬레이터/기기에 빌드·설치
```

## 로컬 DB (PostgreSQL)

```
DB 이름 : japavoca
유저     : root
비밀번호 : 1234
호스트   : 127.0.0.1
포트     : 5432
```

접속 정보는 `apps/server/.env` 에 설정한다(`.env.example` 참고).
