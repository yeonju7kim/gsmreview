# GSM · 기억에서 삶으로

GSM 설교의 핵심 메시지를 다시 읽고, 가장 기억에 남은 것과 앞으로 한 달 동안 지킬 액션
포인트를 남기는 모바일 중심 회고 페이지입니다.

## 로컬에서 보기

```powershell
node server.mjs
```

브라우저에서 `http://localhost:4173`을 엽니다.

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 정적 파일을 빌드하고 GitHub Pages에
배포합니다. 배포본은 GitHub 저장소 Secret인 `FORM_RECIPIENT`를 이용해 FormSubmit 제출 주소를
생성하므로 수신 이메일 주소가 소스 코드나 Git 이력에 저장되지 않습니다.

FormSubmit을 처음 연결한 뒤에는 수신함으로 오는 활성화 메일을 한 번 확인해야 합니다. 활성화가
끝나면 김연주에게 응답이 전송되고, 작성자가 이메일을 선택 입력한 경우 같은 내용이 해당 주소에도
전송됩니다.

## 로컬 이메일 제출 설정

응답은 `/api/submit`을 거쳐 이메일로 전송되므로 수신 주소와 API 키가 브라우저에 노출되지
않습니다. 로컬의 `.env.local`에는 수신 주소가 설정되어 있습니다.

1. Resend 계정을 수신 주소와 같은 이메일로 만듭니다.
2. API 키를 발급받습니다.
3. `.env.local`의 `RESEND_API_KEY`에 키를 입력합니다.
4. `node server.mjs`로 다시 실행합니다.

API 키가 비어 있는 로컬 환경에서는 안전하게 시안 확인 모드로 동작합니다. 제출 내용은 이메일로
전송되지 않고 해당 브라우저의 로컬 저장소에 최대 10개까지 임시 저장됩니다. 배포 환경에서는
`RESEND_API_KEY`, `GSM_RECIPIENT_EMAIL`, `GSM_FROM_EMAIL`을 환경변수로 등록해야 합니다.

제출 API는 JSON 형식의 다음 필드를 전달받습니다.

- `name`: 이름 또는 `익명`
- `messageIds`: 선택한 메시지 ID 목록
- `messages`: 선택한 메시지 제목 목록
- `seminarDetail`: 선택한 강의나 세미나 이름(해당 항목 선택 시)
- `reflection`: 마음에 남은 이유와 느낀 점
- `actionPoint`: 한 달 액션 포인트
- `prayerRequest`: 함께 기도받고 싶은 제목(필수)
- `respondentEmail`: 본인 다짐 사본을 받을 이메일 주소(선택)
- `submittedAt`: 제출 시각
