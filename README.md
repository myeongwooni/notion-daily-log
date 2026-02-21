# Notion Daily Log (Template Version)

노션 데이터베이스에 템플릿을 적용하여 업무일지를 자동 생성합니다.

## ⏰ 실행 스케줄
- 한국시간(KST)
- 월요일 ~ 금요일
- 오전 8시 자동 실행

## 📌 생성 규칙
- 제목 형식: YYYY.MM.DD
- 중복 생성 방지
- 템플릿 자동 적용
- 날짜(Date) 속성 자동 입력

---

## 🔐 GitHub Secrets 설정

Settings → Security → Secrets and variables → Actions → Repository secrets

필수 3개:

1️⃣ NOTION_TOKEN  
노션 Internal Integration 토큰

2️⃣ NOTION_DATABASE_ID  

3️⃣ NOTION_TEMPLATE_NAME  
예: 업무 일지 템플릿

⚠️ 템플릿 이름은 노션과 정확히 일치해야 합니다.

---

## 🧪 테스트

Actions → 노션 업무일지 자동 생성 → Run workflow
