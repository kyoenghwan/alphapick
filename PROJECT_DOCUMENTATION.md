# AlphaPick 관리자 대시보드 프로젝트 문서

## 목차
1. [프로그램 개요](#프로그램-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [Firestore 데이터베이스 설계](#firestore-데이터베이스-설계)
4. [주요 기능](#주요-기능)
5. [기술 스택](#기술-스택)
6. [프로젝트 구조](#프로젝트-구조)
7. [구현 세부사항](#구현-세부사항)
8. [배포 및 실행](#배포-및-실행)
9. [API 엔드포인트](#api-엔드포인트)
10. [데이터 수집 프로세스](#데이터-수집-프로세스)
11. [마이그레이션 프로세스](#마이그레이션-프로세스)

---

## 프로그램 개요

### 프로젝트명
**AlphaPick** - 게임 데이터 분석 및 AI 픽 서비스 관리자 대시보드

### 목적
AlphaPick은 버블사다리 게임의 결과 데이터를 자동으로 수집, 분석하고 AI 모델을 통해 예측을 제공하는 서비스입니다. 이 관리자 대시보드는 다음과 같은 목적을 가집니다:

1. **실시간 데이터 모니터링**: 게임 결과가 수집되는 실시간 상황을 대시보드에서 확인
2. **통계 분석**: 수집된 데이터를 기반으로 승률, 연패 분포 등 통계 정보 제공
3. **데이터 관리**: 수집된 데이터 조회, 수정, 삭제 등 관리 기능 제공
4. **과거 데이터 마이그레이션**: bepick.net 사이트에서 과거 날짜의 데이터를 수집하여 Firestore에 저장

### 주요 특징
- **실시간 업데이트**: Firestore의 `onSnapshot`을 사용하여 데이터 변경 시 자동으로 UI 업데이트
- **자동 데이터 수집**: Firebase Cloud Functions의 스케줄러를 통해 3분마다 자동으로 최신 게임 결과 수집
- **과거 데이터 복구**: 마이그레이션 기능을 통해 누락된 과거 데이터를 자동으로 수집
- **통계 분석**: 연패 분포, 승률 등 다양한 통계 정보를 시각화

### 2.1 게임 규칙 및 75% 필승 전략 (Game Strategy)

본 시스템은 **3개 요소(좌/우, 3/4줄, 홀/짝) 중 2개가 일치하면 승리**하는 특수 룰을 기반으로 합니다.

#### 실제 결과 (Actual Results) - 4가지
*   **L3X** (좌3짝)
*   **L4O** (좌4홀)
*   **R3O** (우3홀)
*   **R4X** (우4짝)

#### 예측 픽 (Prediction Picks) - 4가지 전략 픽
봇은 실제 결과를 맞추는 것이 아니라, 확률적으로 승리하는 아래 4개 픽 중 하나를 선택합니다.
*   **L3O** (좌3홀)
*   **L4X** (좌4짝)
*   **R3X** (우3짝)
*   **R4O** (우4홀)

#### 승리 조건 (2/3 매칭)
예측 픽의 3개 요소 중 **2개 이상**이 실제 결과와 일치하면 적중(Win)입니다. 
따라서 4개의 예측 픽 중 3개는 항상 승리하고, 1개만 패배하는 구조(75% 승률)를 가집니다.

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │ Detail View  │  │  Migration   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                                │
│                    ┌───────▼───────┐                       │
│                    │  API Routes   │                       │
│                    │  (/api/migrate)│                       │
│                    └───────┬───────┘                       │
└────────────────────────────┼───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│          Firebase Cloud Functions                          │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ collectBubbleLadder  │  │ migrateHistoricalData│       │
│  │    Results (3분마다) │  │   (HTTP onRequest)   │       │
│  └──────────────────────┘  └──────────────────────┘       │
│         │                            │                     │
│         │                            │                     │
│         └────────────┬───────────────┘                     │
│                      │                                     │
│              ┌───────▼────────┐                            │
│              │   Puppeteer    │                            │
│              │  (Web Scraping) │                            │
│              └───────┬────────┘                            │
│                      │                                     │
│              ┌─────────▼─────────┐                          │
│              │   bepick.net     │                          │
│              │  (데이터 소스)    │                          │
│              └──────────────────┘                          │
└────────────────────────────┬───────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Firestore     │
                    │   Database      │
                    └─────────────────┘
```

### 데이터 흐름

1. **실시간 수집 프로세스**:
   - Cloud Functions 스케줄러가 3분마다 `collectBubbleLadderResults` 실행
   - Puppeteer로 bepick.net 접속하여 최신 회차 결과 수집
   - Firestore에 데이터 저장
   - Frontend의 `onSnapshot`이 변경사항 감지하여 UI 자동 업데이트

2. **마이그레이션 프로세스**:
   - 관리자가 날짜 범위 선택 후 "마이그레이션 시작" 클릭
   - Frontend → Next.js API Route (`/api/migrate`) → Cloud Function (`migrateHistoricalData`)
   - Cloud Function이 각 날짜별로 데이터 존재 여부 확인
   - 480개 미만이면 Puppeteer로 해당 날짜의 모든 회차 데이터 수집
   - Firestore에 배치 저장

---

## Firestore 데이터베이스 설계

### 컬렉션 구조

```
games/
  └── {year}/                    # 연도별 문서 (예: "2026")
      ├── count/                 # 통계 컬렉션
      │   └── {YYYYMMDD}/        # 날짜별 통계 문서 (예: "20260103")
      │       └── [통계 필드들]
      │
      └── result/                # 결과 컬렉션
          └── {YYYYMMDD}/        # 날짜별 결과 문서 (예: "20260103")
              └── rounds/        # 회차별 서브컬렉션
                  └── {round_no}/ # 회차 번호 (001~480)
                      └── [회차 데이터 필드들]
```

### 상세 스키마

#### 1. 통계 문서: `games/{year}/count/{YYYYMMDD}`

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `total_collected` | number | 수집된 총 회차 수 | 480 |
| `total_hits` | number | 총 적중 횟수 | 240 |
| `win_rate` | number | 승률 (0~100) | 50.0 |
| `max_loss_streak` | number | 최대 연패 횟수 | 5 |
| `loss_streak_distribution` | object | 연패 분포 (키: "N_loss", 값: 횟수) | `{"1_loss": 10, "2_loss": 5, ...}` |
| `missing_rounds` | array | 누락된 회차 번호 배열 | `[123, 456]` |
| `last_updated` | timestamp | 마지막 업데이트 시간 | Firestore Timestamp |

**예시 데이터**:
```json
{
  "total_collected": 480,
  "total_hits": 240,
  "win_rate": 50.0,
  "max_loss_streak": 5,
  "loss_streak_distribution": {
    "1_loss": 10,
    "2_loss": 5,
    "3_loss": 3,
    "4_loss": 1,
    "5_loss": 1
  },
  "missing_rounds": [],
  "last_updated": "2026-01-03T12:00:00Z"
}
```

#### 2. 회차 문서: `games/{year}/result/{YYYYMMDD}/rounds/{round_no}`

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `round` | number | 회차 번호 (1~480) | 123 |
| `result` | string \| null | 변환된 결과 (R4O, L3X 형식) | "R4O" |
| `resultOriginal` | string \| null | 원본 결과 (우4짝, 좌3홀 형식) | "우4짝" |
| `predicted_pick` | string \| null | AI 예측 픽 | "R4O" |
| `is_hit` | boolean \| null | 적중 여부 (true: 적중, false: 미적중, null: 미확인) | true |
| `model_used` | string \| null | 사용된 AI 모델 ("flash" 또는 "pro") | "flash" |
| `current_loss_streak` | number | 현재 연패 횟수 | 0 |
| `createdAt` | timestamp | 생성 시간 | Firestore Timestamp |
| `updatedAt` | timestamp | 업데이트 시간 | Firestore Timestamp |

**결과 형식 설명**:
- `result`: 변환된 형식
  - 방향: `R` (우/Right), `L` (좌/Left)
  - 숫자: 1~4
  - 홀짝: `O` (홀/Odd), `X` (짝/Even)
  - 예: `R4O` = 우4홀, `L3X` = 좌3짝

- `resultOriginal`: 원본 형식
  - 방향: "우", "좌"
  - 숫자: 1~4
  - 홀짝: "홀", "짝"
  - 예: "우4홀", "좌3짝"

**예시 데이터**:
```json
{
  "round": 123,
  "result": "R4O",
  "resultOriginal": "우4홀",
  "predicted_pick": "R4O",
  "is_hit": true,
  "model_used": "flash",
  "current_loss_streak": 0,
  "createdAt": "2026-01-03T10:00:00Z",
  "updatedAt": "2026-01-03T10:00:00Z"
}
```

### 인덱스 설계

Firestore 쿼리 최적화를 위한 인덱스:

1. **최근 회차 조회**:
   - 컬렉션: `games/{year}/result/{YYYYMMDD}/rounds`
   - 정렬: `updatedAt` (descending)
   - 제한: 20개

2. **회차별 조회**:
   - 컬렉션: `games/{year}/result/{YYYYMMDD}/rounds`
   - 정렬: `round` (descending)

### 데이터 무결성 규칙

1. **회차 범위**: 1~480 사이의 정수만 허용
2. **결과 형식**: `result`는 `R`/`L` + `1`~`4` + `O`/`X` 형식이어야 함
3. **날짜 형식**: `YYYYMMDD` 형식 (예: "20260103")
4. **통계 일관성**: `total_collected`는 실제 rounds 컬렉션의 문서 수와 일치해야 함
5. **연패 계산**: `current_loss_streak`는 이전 회차의 `current_loss_streak`를 기반으로 계산

---

## 주요 기능

### 1. 대시보드 (Dashboard)

**경로**: `/admin`

**기능**:
- **요약 카드**: 오늘의 총 수집 회차, 현재 승률, 최대 연패, 현재 연패 상황을 카드 형태로 표시
- **연패 분포 차트**: `loss_streak_distribution` 데이터를 바 차트로 시각화
- **최근 회차 리스트**: 가장 최근 수집된 20개 회차를 테이블로 표시
  - 회차 번호
  - AI 픽
  - 결과
  - 적중 여부 (Badge)
  - 사용 모델 (Flash/Pro)
  - 수집 시간
- **수동 제어**: 특정 회차의 결과를 직접 입력/수정할 수 있는 모달

**실시간 업데이트**: `onSnapshot`을 사용하여 데이터 변경 시 자동으로 UI 갱신

### 2. 결과 조회 (Detail View)

**경로**: `/admin/detail`

**기능**:
- 날짜 입력 필드로 특정 날짜 선택
- 해당 날짜의 모든 회차 데이터를 최근 순으로 표시
- 표시 정보:
  - 년/월/일
  - 회차
  - 픽 (AI 예측)
  - 결과
  - 승/패
  - 적중/미적중
  - 사용 모델
  - 수집 시간

### 3. 데이터 마이그레이션 (Migration)

**경로**: `/admin/migration`

**기능**:
- **날짜 범위 선택**: FROM~TO 날짜 범위 지정
- **COUNT 조회**: 선택한 날짜 범위의 각 날짜별 수집된 회차 수 확인
  - 완료 상태: 480개 이상 수집 완료
  - 미완료 상태: 480개 미만 (부족한 개수 표시)
- **마이그레이션 실행**: 
  - 선택한 날짜 범위의 모든 날짜에 대해 마이그레이션 시도
  - 각 날짜별로 `total_collected >= 480` 확인
  - 480개 미만이면 bepick.net에서 데이터 수집
  - 진행 상황 및 결과 표시

**마이그레이션 프로세스**:
1. 날짜 범위 선택
2. "COUNT 조회" 버튼 클릭 (선택사항)
3. "마이그레이션 시작" 버튼 클릭
4. 각 날짜별로 순차적으로 마이그레이션 실행
5. 진행 상황 및 완료 메시지 표시

### 4. 사용자 관리 (Users)

**경로**: `/admin/users`

**기능**: (향후 구현 예정)
- 사용자 목록 조회
- 사용자 권한 관리
- 사용자 활동 로그

### 5. 설정 (Settings)

**경로**: `/admin/settings`

**기능**: (향후 구현 예정)
- 시스템 설정
- 알림 설정
- 데이터 백업/복원

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.2.5 | React 프레임워크 (App Router) |
| React | 18.3.1 | UI 라이브러리 |
| TypeScript | 5.5.3 | 타입 안정성 |
| Tailwind CSS | 3.4.7 | 유틸리티 기반 CSS 프레임워크 |
| Shadcn/UI | - | UI 컴포넌트 라이브러리 |
| Firebase Client SDK | 10.12.2 | Firestore 실시간 구독 및 데이터 조작 |
| Recharts | 2.12.7 | 차트 시각화 |
| date-fns | 3.6.0 | 날짜 처리 |
| Lucide React | 0.427.0 | 아이콘 |

### Backend (Cloud Functions)

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 20 | 런타임 환경 |
| Firebase Functions | 5.0.0 | 서버리스 함수 프레임워크 |
| Firebase Admin SDK | 12.0.0 | Firestore 서버 사이드 접근 |
| Puppeteer | 21.11.0 | 웹 스크래핑 (헤드리스 브라우저) |
| TypeScript | 5.0.0 | 타입 안정성 |

### Database

| 기술 | 용도 |
|------|------|
| Firestore | NoSQL 문서 데이터베이스 |

### 개발 도구

| 기술 | 용도 |
|------|------|
| ESLint | 코드 품질 검사 |
| PostCSS | CSS 후처리 |
| Autoprefixer | CSS 벤더 프리픽스 자동 추가 |

---

## 프로젝트 구조

```
AlphaPick/
├── app/                          # Next.js App Router
│   ├── admin/                    # 관리자 페이지
│   │   ├── page.tsx              # 대시보드 메인
│   │   ├── layout.tsx            # 관리자 레이아웃 (사이드바 포함)
│   │   ├── detail/               # 결과 조회 페이지
│   │   │   └── page.tsx
│   │   ├── migration/            # 마이그레이션 페이지
│   │   │   └── page.tsx
│   │   ├── users/               # 사용자 관리 (향후 구현)
│   │   │   └── page.tsx
│   │   └── settings/             # 설정 (향후 구현)
│   │       └── page.tsx
│   ├── api/                      # Next.js API Routes
│   │   └── migrate/              # 마이그레이션 프록시 API
│   │       └── route.ts
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # 전역 스타일
│
├── components/                   # 재사용 가능한 컴포넌트
│   ├── admin/                    # 관리자 전용 컴포넌트
│   │   ├── Sidebar.tsx           # 사이드바 네비게이션
│   │   ├── StatCards.tsx         # 통계 카드
│   │   ├── LossStreakChart.tsx   # 연패 분포 차트
│   │   ├── RecentRounds.tsx      # 최근 회차 테이블
│   │   └── ManualControl.tsx     # 수동 제어 모달
│   └── ui/                       # Shadcn/UI 컴포넌트
│       ├── card.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── input.tsx
│       └── dialog.tsx
│
├── lib/                          # 유틸리티 및 설정
│   ├── firebase.ts               # Firebase 클라이언트 초기화
│   └── utils.ts                  # 공통 유틸리티 함수
│
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts              # Cloud Functions 메인 파일
│   ├── package.json              # Functions 의존성
│   ├── tsconfig.json             # TypeScript 설정
│   └── serviceAccountKey.json    # 서비스 계정 키 (로컬 테스트용)
│
├── public/                       # 정적 파일
│
├── package.json                  # 프로젝트 의존성
├── tsconfig.json                 # TypeScript 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── next.config.mjs               # Next.js 설정
├── firebase.json                 # Firebase 설정
└── PROJECT_DOCUMENTATION.md      # 이 문서
```

---

## 구현 세부사항

### 1. 실시간 데이터 구독

**파일**: `app/admin/page.tsx`

```typescript
// count 문서 실시간 구독
const countRef = doc(db, `games/${year}/count/${dateStr}`);
const unsubscribeCount = onSnapshot(countRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data() as CountData;
    setCountData(data);
  }
  setIsLoading(false);
}, (error) => {
  console.error("COUNT 구독 오류:", error);
  setCountData(null);
  setIsLoading(false);
});

// 최근 회차 실시간 구독
const roundsRef = collection(db, `games/${year}/result/${dateStr}/rounds`);
const q = query(roundsRef, orderBy("updatedAt", "desc"), limit(20));
const unsubscribeRounds = onSnapshot(q, (snapshot) => {
  const rounds: RoundData[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as RoundData;
    if (data.result !== null) {
      rounds.push(data);
    }
  });
  setRecentRounds(rounds);
});
```

**특징**:
- `onSnapshot`을 사용하여 Firestore 변경사항을 실시간으로 감지
- 에러 핸들링을 통해 권한 오류 등 예외 상황 처리
- 컴포넌트 언마운트 시 구독 해제하여 메모리 누수 방지

### 2. 자동 데이터 수집 (Cloud Function)

**파일**: `functions/src/index.ts` - `collectBubbleLadderResults`

**스케줄**: 3분마다 자동 실행

**프로세스**:
1. Puppeteer로 bepick.net 접속
2. 최신 회차 결과 추출
3. Firestore에 저장 (중복 확인)
4. 통계 업데이트 (count 문서)
5. 연패 통계 계산 및 업데이트

**주요 로직**:
- 날짜 변경 감지 시 001~480 라운드 문서 자동 초기화
- 이전 회차의 `current_loss_streak`를 읽어 현재 연패 계산
- `is_hit`이 있을 때만 연패 통계 업데이트
- 배치 처리로 Firestore 쓰기 최적화

### 3. 마이그레이션 기능

**Frontend**: `app/admin/migration/page.tsx`
**Backend**: `functions/src/index.ts` - `migrateHistoricalData`
**API Proxy**: `app/api/migrate/route.ts`

**프로세스**:
1. 날짜 범위 선택 (FROM~TO)
2. "COUNT 조회" 버튼으로 각 날짜별 수집 현황 확인 (선택사항)
3. "마이그레이션 시작" 버튼 클릭
4. Frontend → Next.js API Route → Cloud Function 호출
5. 각 날짜별로 순차 처리:
   - `total_collected >= 480` 확인
   - 480개 미만이면 Puppeteer로 데이터 수집
   - "더보기" 버튼 클릭하여 모든 회차 로드
   - DOM에서 데이터 추출 (XPath, `::after` pseudo-element)
   - Firestore에 배치 저장
6. 진행 상황 및 결과 표시

**CORS 해결**:
- Cloud Function 직접 호출 시 CORS 오류 발생
- Next.js API Route를 프록시로 사용하여 CORS 문제 해결

### 4. 웹 스크래핑 (Puppeteer)

**데이터 소스**: `https://bepick.net/main.p#/game/daily/bubble_ladder3/{YYYYMMDD}`

**추출 방법**:
1. 메인 페이지 접속 후 해시 라우팅으로 특정 날짜로 이동
2. 테이블 로드 대기 (`#dt_list`)
3. "더보기" 버튼 (`#dt_more`) 클릭하여 모든 회차 로드
4. 각 행에서 데이터 추출:
   - 날짜: `td[1]/div/span[1]`
   - 회차: `td[1]/div/strong`
   - 방향 (좌/우): `td[3]/span`의 `::after` pseudo-element
   - 숫자 (1~4): `td[4]/span`의 `::after` pseudo-element
   - 홀짝: `td[5]/span`의 `::after` pseudo-element

**데이터 변환**:
- 원본: "우4홀" → 변환: "R4O"
- 원본: "좌3짝" → 변환: "L3X"

### 5. 통계 계산

**연패 통계 (`current_loss_streak`)**:
- 이전 회차의 `current_loss_streak` 읽기
- 현재 회차의 `is_hit` 확인
  - `is_hit === false`: 이전 streak + 1
  - `is_hit === true`: 0으로 초기화
  - `is_hit === null`: 이전 값 유지

**연패 분포 (`loss_streak_distribution`)**:
- 적중 시 (`is_hit === true`) 이전 연패 횟수 기록
- 키 형식: `"{N}_loss"` (예: "3_loss")
- 값: 해당 연패 횟수가 발생한 횟수

**최대 연패 (`max_loss_streak`)**:
- 각 회차의 `current_loss_streak`와 비교하여 최대값 업데이트

---

## 배포 및 실행

### 환경 변수 설정

**Frontend (`.env.local`)**:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alphapick-a9b9e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Backend (Cloud Functions)**:
- Firebase Console에서 자동으로 환경 변수 관리
- 서비스 계정 키는 배포 시 자동으로 사용

### 로컬 개발

**Frontend 실행**:
```bash
# 프로젝트 루트에서
npm install
npm run dev
# http://localhost:3000 접속
```

**Cloud Functions 로컬 테스트**:
```bash
cd functions
npm install
npm run build
firebase emulators:start --only functions
```

### 배포

**Frontend 배포** (예: Vercel):
```bash
npm run build
# Vercel에 자동 배포 또는 수동 배포
```

**Cloud Functions 배포**:
```bash
cd functions
npm run build
firebase deploy --only functions:collectBubbleLadderResults
firebase deploy --only functions:migrateHistoricalData
```

**전체 Functions 배포**:
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 접속 URL

- **로컬 개발**: `http://localhost:3000/admin`
- **프로덕션**: 배포된 도메인 + `/admin`

---

## API 엔드포인트

### 1. 마이그레이션 API

**경로**: `/api/migrate`

**메서드**: `POST`

**요청 본문**:
```json
{
  "date": "20260103"
}
```

**응답 (성공)**:
```json
{
  "success": true,
  "collected": 480,
  "message": "마이그레이션이 완료되었습니다."
}
```

**응답 (실패)**:
```json
{
  "error": "마이그레이션 중 오류가 발생했습니다.",
  "message": "상세 오류 메시지",
  "stack": "에러 스택 트레이스"
}
```

**Cloud Function URL**:
```
https://us-central1-{project-id}.cloudfunctions.net/migrateHistoricalData
```

---

## 데이터 수집 프로세스

### 자동 수집 (스케줄러)

**트리거**: Firebase Cloud Scheduler (3분마다)

**프로세스**:
1. `collectBubbleLadderResults` 함수 실행
2. Puppeteer로 bepick.net 접속
3. 최신 회차 결과 추출
4. Firestore 중복 확인
5. 데이터 저장 및 통계 업데이트

**에러 처리**:
- 에러 발생 시 로그만 기록하고 다음 스케줄까지 대기
- 브라우저 종료 실패 시에도 다음 실행에 영향 없도록 처리

### 수동 수집 (마이그레이션)

**트리거**: 관리자가 마이그레이션 페이지에서 실행

**프로세스**:
1. 날짜 범위 선택
2. 각 날짜별로 순차 처리
3. 데이터 존재 여부 확인 (`total_collected >= 480`)
4. 필요 시 Puppeteer로 데이터 수집
5. Firestore에 배치 저장

**최적화**:
- 배치 크기: 500개 (Firestore 배치 제한)
- 중복 데이터 확인으로 불필요한 쓰기 방지

---

## 마이그레이션 프로세스

### 상세 워크플로우

1. **날짜 범위 선택**
   - FROM 날짜와 TO 날짜 입력
   - 기본값: 오늘부터 7일 전까지

2. **COUNT 조회** (선택사항)
   - "COUNT 조회" 버튼 클릭
   - 각 날짜별 `total_collected` 확인
   - 완료/미완료 상태 표시

3. **마이그레이션 시작**
   - "마이그레이션 시작" 버튼 클릭
   - 선택한 날짜 범위의 모든 날짜에 대해 순차 처리

4. **각 날짜별 처리**
   ```
   FOR each date in date_range:
     - Firestore에서 count 문서 확인
     - IF total_collected >= 480:
         - SKIP (이미 완료)
       ELSE:
         - Puppeteer로 bepick.net 접속
         - 해시 라우팅으로 해당 날짜로 이동
         - "더보기" 버튼 클릭 (모든 회차 로드)
         - DOM에서 데이터 추출
         - Firestore에 배치 저장
         - count 문서 업데이트
   ```

5. **진행 상황 표시**
   - 현재 처리 중인 날짜
   - 진행률 (퍼센트)
   - 완료 메시지

### 데이터 추출 상세

**DOM 구조**:
```html
<table id="dt_list">
  <tbody>
    <tr>
      <td>
        <div>
          <span>2026-01-03</span>
          <strong>123</strong>
        </div>
      </td>
      <td>...</td>
      <td>
        <span></span> <!-- ::after에 "우" 또는 "좌" -->
      </td>
      <td>
        <span></span> <!-- ::after에 "1", "2", "3", "4" -->
      </td>
      <td>
        <span></span> <!-- ::after에 "홀" 또는 "짝" -->
      </td>
    </tr>
    ...
  </tbody>
</table>
```

**XPath 사용**:
- `//*[@id="dt_list"]/tbody/tr[N]/td[1]/div/span[1]` - 날짜
- `//*[@id="dt_list"]/tbody/tr[N]/td[1]/div/strong` - 회차
- `//*[@id="dt_list"]/tbody/tr[N]/td[3]/span` - 방향
- `//*[@id="dt_list"]/tbody/tr[N]/td[4]/span` - 숫자
- `//*[@id="dt_list"]/tbody/tr[N]/td[5]/span` - 홀짝

**`::after` pseudo-element 추출**:
```typescript
const getAfterContent = (element: Element): string => {
  const styles = window.getComputedStyle(element, "::after");
  const content = styles.content;
  return content.replace(/^["']|["']$/g, "");
};
```

### 에러 처리

**일반적인 에러**:
- 네트워크 오류: 재시도 로직 없음 (수동 재실행 필요)
- DOM 요소 없음: 해당 행 스킵하고 계속 진행
- 데이터 파싱 실패: 해당 행 스킵하고 계속 진행

**에러 응답 형식**:
```json
{
  "error": "마이그레이션 중 오류가 발생했습니다.",
  "message": "상세 오류 메시지",
  "stack": "에러 스택 트레이스",
  "date": "20260103"
}
```

---

## 추가 정보

### 주의사항

1. **Firestore 보안 규칙**: 관리자 대시보드는 인증이 필요할 수 있습니다. Firestore 보안 규칙을 적절히 설정하세요.

2. **Cloud Functions 타임아웃**: 마이그레이션 함수는 최대 실행 시간이 제한됩니다. 많은 날짜를 한 번에 마이그레이션할 때는 주의하세요.

3. **Puppeteer 리소스**: Puppeteer는 메모리를 많이 사용합니다. Cloud Functions의 메모리 제한을 고려하세요.

4. **배치 크기**: Firestore 배치 쓰기는 최대 500개입니다. 이를 초과하지 않도록 주의하세요.

### 향후 개선 사항

1. **인증 시스템**: 관리자 로그인 기능 추가
2. **사용자 관리**: 사용자 목록 및 권한 관리
3. **알림 시스템**: 데이터 수집 실패 시 알림
4. **데이터 백업**: 정기적인 데이터 백업 기능
5. **성능 최적화**: 대량 데이터 조회 시 페이지네이션
6. **에러 복구**: 자동 재시도 로직 추가

---

## 문의 및 지원

프로젝트 관련 문의사항이 있으시면 개발팀에 연락해주세요.

---

**문서 작성일**: 2026-01-03
**프로젝트 버전**: 0.1.0
**최종 업데이트**: 2026-01-03

