# notion-daily-log

노션 데이터베이스에 업무일지를 자동 생성합니다.

- 스케줄: **한국시간(KST) 월~금 오전 8시**
- 제목: `YYYY.MM.DD`
- 중복 방지: 같은 제목이 있으면 생성하지 않음

## GitHub Secrets 설정

저장소 → 설정(Settings) → 보안(Security) → 비밀 및 변수(Secrets and variables) → Actions

- `NOTION_TOKEN` : 노션 내부 통합 토큰
- `NOTION_DATABASE_ID` : 노션 데이터베이스 ID
- `TITLE_PROP_NAME` : `제목`

## 테스트(수동 실행)

Actions 탭 → **노션 업무일지 자동 생성** → **Run workflow**
