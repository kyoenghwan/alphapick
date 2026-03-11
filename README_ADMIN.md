# AlphaPick 관리자 대시보드

AlphaPick 게임 데이터를 관리하고 분석할 수 있는 관리자 대시보드입니다.

## 기능

### 메인 대시보드
- **요약 카드**: 오늘 총 수집 회차, 현재 승률(%), 오늘 최대 미적중 횟수, 현재 연패 상황
- **연패 분포 차트**: loss_streak_distribution 데이터를 바 차트로 시각화
- **최근 회차 리스트**: 가장 최근 수집된 20개 회차를 테이블로 표시
- **수동 제어**: 회차 결과 수정 및 AI 분석 재실행 기능

### 실시간 업데이트
- Firestore의 `onSnapshot`을 사용하여 데이터 변경 시 자동으로 대시보드가 업데이트됩니다.

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 Firebase 설정을 추가하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alphapick-a9b9e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Firebase 콘솔에서 웹 앱 설정을 확인하여 위 값들을 입력하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000/admin](http://localhost:3000/admin)로 접속하세요.

## 프로젝트 구조

```
.
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # 관리자 레이아웃 (사이드바 포함)
│   │   ├── page.tsx            # 메인 대시보드
│   │   ├── detail/
│   │   ├── users/
│   │   └── settings/
│   ├── globals.css             # 전역 스타일 (다크 모드)
│   └── layout.tsx              # 루트 레이아웃
├── components/
│   ├── admin/
│   │   ├── Sidebar.tsx         # 사이드바 네비게이션
│   │   ├── StatCards.tsx       # 요약 카드 컴포넌트
│   │   ├── LossStreakChart.tsx # 연패 분포 차트
│   │   ├── RecentRounds.tsx    # 최근 회차 테이블
│   │   └── ManualControl.tsx   # 수동 제어 모달
│   └── ui/                     # Shadcn/UI 컴포넌트
├── lib/
│   ├── firebase.ts             # Firebase 초기화
│   └── utils.ts                # 유틸리티 함수
└── package.json
```

## Firestore 데이터 구조

### 통계 데이터
- 경로: `games/{year}/count/{YYYYMMDD}`
- 필드:
  - `total_collected`: 총 수집 회차
  - `total_hits`: 총 적중 횟수
  - `win_rate`: 승률
  - `max_loss_streak`: 최대 연패 횟수
  - `loss_streak_distribution`: 연패 분포 (예: `{ "1_loss": 5, "2_loss": 3 }`)

### 상세 데이터
- 경로: `games/{year}/result/{YYYYMMDD}/rounds/{round_no}`
- 필드:
  - `round`: 회차 번호
  - `result`: 결과 (R4O 형식)
  - `predicted_pick`: AI 예측
  - `is_hit`: 적중 여부
  - `model_used`: 사용 모델 (flash/pro)
  - `current_loss_streak`: 현재 연패 횟수
  - `updatedAt`: 수집 시간

## 주요 기능 설명

### 1. 실시간 데이터 모니터링
- `onSnapshot`을 사용하여 Firestore 데이터 변경 시 자동 업데이트
- 새 회차가 수집되면 대시보드가 자동으로 갱신됩니다.

### 2. 연패 분포 분석
- `loss_streak_distribution` 데이터를 바 차트로 시각화
- 특정 연패 구간(예: 4연패 이상)의 발생 빈도를 확인하여 배팅 전략의 위험도를 관리

### 3. AI 신뢰도 체크
- Flash 모델과 Pro 모델의 적중률을 비교하여 비용 대비 효율 판단
- 최근 회차 테이블에서 모델별 성과를 확인

### 4. 데이터 무결성 확인
- `total_collected`가 3분 주기로 정상적으로 증가하는지 감시
- 수집 오류 시 수동으로 회차 결과를 입력/수정 가능

## 기술 스택

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS** (다크 모드)
- **Firebase Client SDK** (Firestore)
- **Recharts** (차트 시각화)
- **Shadcn/UI** (UI 컴포넌트)
- **Lucide React** (아이콘)
- **date-fns** (날짜 처리)

## 추가 개발 예정

- [ ] 상세조회 페이지 (특정 날짜/회차 상세 정보)
- [ ] 유저관리 페이지
- [ ] 설정 페이지 (알림, 자동화 등)
- [ ] AI 분석 재실행 기능 (Cloud Function 연동)
- [ ] 데이터 내보내기 기능 (CSV, Excel)

