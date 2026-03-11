# 봇 출력 형식 명세서 (Bot Output Format Documentation)

이 문서는 각 봇 분석 생성기의 JSON 출력 구조와, **AI가 이 데이터를 어떻게 해석하고 전략에 반영해야 하는지**를 설명합니다.

## 공통 인터페이스 (`IPipelineSummary`)

모든 봇은 아래와 같은 JSON 객체 구조를 출력합니다:

```json
{
  "botId": "BOT_XX",
  "layer1_macro": {
    "today_l_prob": 50.5, // 금일 좌(Left) 출현 확률 (%)
    "today_3_prob": 48.0, // 금일 3줄 출현 확률 (%)
    "today_o_prob": 51.2  // 금일 홀(Odd) 출현 확률 (%)
  },
  "layer2_rolling": {
    "summary_text": "..." // 봇별 상세 분석 텍스트
  },
  "layer3_raw": ["L3O", "R4E", ...] // 최근 원본 데이터
}
```

---

## Bot 01: 마르코프 체인 (Markov Chain)
**목표:** 현재 상태에서 다음 상태로 넘어갈 전이 확률(Transition Probability)을 계산하여 예측합니다.

### `summary_text` 예시
```text
Short-Term Markov Analysis (Last 120):
[Current State]
- Last Round: L3O (Direction=L, Line=3, OE=Odd)

[Direction L/R]
- L Transition: Keep=45.5%, Flip=54.5%
- R Transition: Keep=60.0%, Flip=40.0%
...
```

### 💡 AI 분석 포인트 (패턴 예측)
이 데이터는 AI에게 **"지금 이 그림(패턴) 뒤에 무엇이 가장 자주 나왔는가?"**를 알려줍니다.
1.  **전이 확률 우위:**
    *   예: `R Transition: Keep=60%`라면, 직전 결과가 R일 때 또 R이 나올 확률이 60%라는 뜻입니다.
    *   **AI 판단:** "역사는 반복된다. R 줄(Streak)에 베팅해라."
2.  **반전 신호 (Flip):**
    *   예: `L Transition: Flip=54.5%`라면, L 뒤에는 R로 꺾이는 경우가 더 많았다는 뜻입니다.
    *   **AI 판단:** "이번엔 꺾일 확률이 높다. 반대쪽(R)을 봐라."

---

## Bot 02: 퐁당 패턴 (Pongdang Pattern)
**목표:** 높은 빈도로 결과가 뒤집히는 '퐁당(L-R-L-R)' 환경을 식별합니다.

### `summary_text` 예시
```text
Pongdang Pattern Analysis (Last 120):
[Direction L/R]
- Flip Rate: 72/119 (60.5%)
- Max Streak: 3
- Current Streak: 1
- Status: High Alternation (Pongdang)
...
```

### 💡 AI 분석 포인트 (퐁당 전략)
이 데이터는 AI에게 **"지금 줄을 탈 때인가, 꺾을 때인가?"**를 알려줍니다.
1.  **퐁당 환경 식별 (Flip Rate):**
    *   `Flip Rate: 60.5%`: 10번 중 6번은 그림이 바뀝니다.
    *   **AI 판단:** "줄 타면 죽는다. 무조건 꺾어라 (Opposite Bet)."
2.  **진입 타점 (Current Streak):**
    *   `Current Streak: 1` + `High Alternation`: 지금이 딱 꺾일 타이밍입니다.
    *   **AI 판단:** "타점이 왔다. 강력하게 퐁당(반대)에 걸어라."

---

## Bot 03: 지수이동평균 (EMA Momentum)
**목표:** 최근 데이터에 가중치를 두어 현재 추세(Trend)의 강도와 방향을 측정합니다.

### `summary_text` 예시
```text
EMA Momentum Analysis (Short-Term Trend):
[Direction L/R]
- Value: 78.5 (Threshold: +/-10.0)
- Trend: Strong L
...
```

### 💡 AI 분석 포인트 (기세 파악)
이 데이터는 AI에게 **"지금 이 흐름이 얼마나 센가?" (파워 미터기)**를 알려줍니다.
1.  **강력한 추세 (Strong Trend):**
    *   `Trend: Strong L`: L 방향으로의 쏠림이 매우 강합니다.
    *   **AI 판단:** "역추세(꺾기) 금지. 무조건 L 줄을 따라가라 (Trend Following)."
2.  **횡보장 (Neutral):**
    *   `Value: 2.1`: 어느 한쪽으로 쏠리지 않았습니다.
    *   **AI 판단:** "기세가 없다. 패턴 분석(Bot 01)이나 퐁당(Bot 02)에 의존해라."

---

## Bot 04: Z-Score 표준점수 (Z-Score Deviation)
**목표:** 평균 대비 현재 상태의 이탈 정도를 측정하여 평균 회귀(Mean Reversion) 시점을 포착합니다.

### `summary_text` 예시
```text
Z-Score Deviation Analysis (Last 240):
[Direction L/R]
- Z-Score: 6.58 (L-Count: 171)
- Status: Extreme Left Overload (Reversion Likely)

[Line 3/4]
- Z-Score: -6.46 (3-Count: 70)
- Status: Extreme 3-Line Deficit (Reversion Likely)
...
```

### 💡 AI 분석 포인트 (과열/침체 판단)
이 데이터는 AI에게 **"너무 많이 쏠렸으니 반대로 꺾어야 할 때인가?" (브레이크 담당)**를 알려줍니다.
1.  **극단적 과열 (Extreme Overload):**
    *   `Z-Score: 6.58`: L이 통계적으로 말이 안 될 정도로 많이 나왔습니다.
    *   **AI 판단:** "이건 과하다. 곧 R이 나올 확률이 매우 높다. **과감하게 R로 꺾어라 (Contrarian Bet).**"
2.  **극단적 침체 (Extreme Deficit):**
    *   `Z-Score: -6.46`: 3줄이 너무 안 나왔습니다.
    *   **AI 판단:** "이제 슬슬 3줄이 터질 때가 됐다. **3줄 진입 준비.**"
3.  **정상 범위 (Normal):**
    *   `Z-Score: -0.26`: 아주 평범합니다.
    *   **AI 판단:** "특이점 없음. 통계적 이점이 없으니 베팅 제외."

---

## Bot 05: KNN 패턴 매칭 (KNN Pattern Matching)
**목표:** 현재와 가장 유사한 과거 패턴(최근 5회 흐름)을 찾아, 그 직후 어떤 결과가 나왔는지 통계적으로 분석합니다.

### `summary_text` 예시
```text
KNN Pattern Matching (Pattern Len=5):
[Direction L/R]
- Similar Patterns Found: 12
- Next Prediction: L=100% (Bias: L)

[Line 3/4]
- Similar Patterns Found: 0
- Next Prediction: 3=0% (Bias: None)

[Odd/Even O/E]
- Similar Patterns Found: 5
- Next Prediction: Odd=60% (Bias: Odd)

Focus: Historical recurrence of the exact current sequence (5-step).
```

### 💡 AI 분석 포인트 (역사적 재현성)
이 데이터는 AI에게 **"옛날에도 이런 그림이었을 때, 그 다음엔 뭐가 나왔나?"**를 알려줍니다.
1.  **패턴 포착 (Similar Patterns Found):**
    *   `Found: 12`: 과거에 똑같은 그림이 12번이나 있었습니다. 데이터 신뢰도가 높습니다.
    *   `Found: 0`: 이런 그림은 처음입니다. **AI 판단:** "데이터 부족. 이 봇의 의견은 무시해라."
2.  **확실한 편향 (Next Prediction):**
    *   `L=100% (Bias: L)`: 과거 12번 모두, 이 그림 뒤엔 **항상 L**이 나왔습니다.
    *   **AI 판단:** "이건 필승 패턴이다. **강력 승부(Strong Bet).**"
3.  **애매한 경우:**
    *   `Odd=60%`: 조금 애매합니다.
    *   **AI 판단:** "참고만 하고 다른 봇 의견을 들어봐라."

---

## Bot 06: 베이지안 추론 (Bayesian Trend Update)
**목표:** **사전 확률(Prior, 장기 30일)**과 **가능도(Likelihood/Evidence, 단기 24시간)**를 결합하여 보정된 **사후 확률(Posterior)**을 도출합니다.

### `summary_text` 예시
```text
Bayesian Trend Update (Prior=Global, Evidence=Last 480):
[Direction L/R]
- Prior: 50.1% -> Evidence: 70.0%
- Posterior: 56.1% (Shifting Up)

[Line 3/4]
- Prior: 49.5% -> Evidence: 45.0%
- Posterior: 48.1% (Stable)

[Odd/Even O/E]
- Prior: 50.5% -> Evidence: 52.0%
- Posterior: 50.9% (Stable)

Focus: How recent evidence shifts the long-term prior belief.
```

### 💡 AI 분석 포인트 (보정된 베팅 확률)
이 데이터는 AI에게 **"최근 흐름(70%)을 타고 싶지만, 얼마나 신중해야 하는가?"**를 수학적으로 계산해줍니다.
1.  **Posterior의 의미 (중요):**
    *   내부 로직: `Posterior = (Prior * 70%) + (Evidence * 30%)` (장기 데이터에 70% 가중치).
    *   상황: 최근 L이 70%나 터지고 있지만(Evidence), 장기적으로는 50%(Prior)입니다.
    *   **AI 판단:** "최근 흐름이 좋지만 70%를 다 믿지 마라. **보정된 확률인 56.1%를 기준으로 켈리 베팅(Kelly Bet) 비중을 조절해라.**"
2.  **추세 변화 (Shifting):**
    *   Gap이 5% 이상 벌어지면 `Shifting` 판정.
    *   **AI 판단:** "단기 파동이 장기 평균을 끌어올리고 있다. 추세 추종(Trend Following) 전략을 쓰되, 비중은 보수적으로 가져가라."

---

## Bot 07: 구간 편차 분석 (Deviation Analysis)
**목표:** **큰 수의 법칙(Law of Large Numbers)**에 따라, 단기적으로 발생한 확률적 괴리(Gap)가 평균으로 회귀할 가능성을 측정합니다.

### `summary_text` 예시
```text
Deviation Analysis (Global vs Last 480):
[Direction L/R]
- Global L: 50.0% vs Recent L: 40.0%
- Gap: 10.0% -> Under-supplied (Expect L)

[Line 3/4]
- Global 3: 49.0% vs Recent 3: 55.0%
- Gap: -6.0% -> Over-supplied (Expect 4)

[Odd/Even O/E]
- Global Odd: 51.0% vs Recent Odd: 50.0%
- Gap: 1.0% -> Under-supplied (Expect Odd)

Focus: Balancing 'Law of Totals' - bet on what is currently missing.
```

### 💡 AI 분석 포인트 (평균 회귀 베팅)
이 데이터는 AI에게 **"지금 통계적으로 '빚'을 지고 있는 쪽이 어디인가?"**를 알려줍니다.
1.  **결손(Under-supplied) 공략:**
    *   `Global(50%)` - `Recent(40%)` = **10% Gap**.
    *   의미: 최근 480판 동안 L이 와야 할 횟수보다 덜 왔습니다.
    *   **AI 판단:** "확률의 균형을 맞추기 위해 앞으로 L이 더 많이 나올 수밖에 없다. **L 쪽으로 분할 매수 진입(Martingale 관점).**"
2.  **과잉(Over-supplied) 회피:**
    *   반대로 너무 많이 나온 쪽은 피합니다. "산이 높으면 골이 깊다."

---

## Bot 08: 시계열 사이클 (Cycle Wave Analysis)
**목표:** 데이터의 **이동평균 기울기(Slope)**를 분석하여 현재 파동이 상승 국면인지 하락 국면인지 판별합니다.

### `summary_text` 예시
```text
Cycle Wave Analysis (Last 480):
[Direction L/R]
- Current Wave Phase: Rising

[Line 3/4]
- Current Wave Phase: Falling

[Odd/Even O/E]
- Current Wave Phase: Flat

Focus: Identify if we are on the rising edge or falling edge of a probability wave.
```

### 💡 AI 분석 포인트 (변곡점 매매)
이 데이터는 AI에게 **"지금 진입해도 되는 타이밍인가?"**를 시각적으로 알려줍니다.
1.  **Rising (상승장):**
    *   최근 5개 윈도우의 평균값이 우상향 중입니다.
    *   **AI 판단:** "달리는 말에 올라타라. 해당 패턴(예: 줄, 퐁당)의 적중률이 올라가는 구간이다."
2.  **Falling (하락장):**
    *   기울기가 꺾였습니다.
    *   **AI 판단:** "기존 패턴이 깨지고 있다. **관망(Hold)하거나 반대 포지션을 준비해라.**"

---

## Bot 09: 추세 강도 MACD (Trend Cross Analysis)
**목표:** **단기 MA(7)**와 **중기 MA(25)**의 교차를 통해 골든크로스(상승 추세 시작)와 데드크로스(하락 추세 시작)를 포착합니다.

### `summary_text` 예시
```text
Trend Cross Analysis (MA7 vs MA25):
[Direction L/R]
- Signal: Strong Up-Trend (Golden Cross)

[Line 3/4]
- Signal: Strong Down-Trend (Dead Cross)

[Odd/Even O/E]
- Signal: Sideways / Choppy

Focus: Golden Cross (Short > Long) vs Dead Cross (Short < Long).
```

### 💡 AI 분석 포인트 (추세 초입 공략)
이 데이터는 AI에게 **"추세가 언제 시작되었는가?"**를 알려주어 뒷북을 방지합니다.
1.  **Golden Cross:**
    *   단기선이 장기선을 뚫은 지 얼마 안 된 `Strong Up-Trend` 상태.
    *   **AI 판단:** "이제 막 상승 기류를 탔다. 가장 안전하고 수익폭이 큰 **진입 적기(Entry Point)**다."
2.  **Sideways (횡보):**
    *   두 선이 겹쳐 있습니다.
    *   **AI 판단:** "추세가 없다. 추세 추종형 봇(Bot 03, 06)보다는 역추세 봇(Bot 04)이나 퐁당(Bot 02)을 믿어라."

---

## Bot 10: 패턴 복기 검증 (Pattern Success Rate)
**목표:** 'L이 3번 나온 후 꺾이는가?'와 같은 특정 가설을 **과거 데이터에서 시뮬레이션(Backtesting)**하여 현재 승률을 검증합니다.

### `summary_text` 예시
```text
Pattern Success Rate Analysis:
[Direction L/R]
- Current Streak: 4
- Reversal Prob: 50.0%

[Line 3/4]
- Current Streak: 1
- Reversal Prob: 50.0%

[Odd/Even O/E]
- Current Streak: 2
- Reversal Prob: 50.0%

Focus: Validating if 'Streak Reversal' betting system is currently profitable.
```

### 💡 AI 분석 포인트 (팩트 체크)
이 데이터는 AI에게 **"이론상으로는 그럴싸한데, 실제로도 돈이 벌리는가?"**를 확인시켜줍니다.
*   **Reversal Prob(반전 확률):** (현재는 50% mock data)
*   **AI 판단:**
    *   만약 `Prob > 60%`: "지금 이 장에서는 '줄 꺾기'가 잘 먹힌다. 꺾어라."
    *   만약 `Prob < 40%`: "지금 꺾으면 죽는다. 줄을 타라."
    *   **즉, AI의 전략 선택(꺾기 vs 타기)에 대한 실증적 근거(Evidence)로 사용됩니다.**

---

## Bot 11: 대수의 법칙 (Law of Large Numbers)
**목표:** 30일간의 거대한 데이터 속에서 **50% 확률로 수렴하려는 절대적인 힘(Reversion Force)**을 측정합니다.

### `summary_text` 예시
```text
Law of Large Numbers (Total 1000 Rounds):
[Direction L (Target 50%)]
- Actual: 45.00% (Diff: 5.00%)
- Force: Strong Push Up

[Line 3 (Target 50%)]
- Actual: 51.20% (Diff: -1.20%)
- Force: Balanced

[Odd/Even Odd (Target 50%)]
- Actual: 49.80% (Diff: 0.20%)
- Force: Balanced

Focus: Long-term convergence towards 50.0%. Large deviations imply strong corrective force.
```

### 💡 AI 분석 포인트 (절대적 균형)
이 데이터는 AI에게 **"우주적 관점에서 지금 틀어진 균형이 무엇인가?"**를 알려줍니다.
1.  **Strong Push Up/Pull Down:**
    *   Actual이 45%라면, 우주는 이를 50%로 맞추기 위해 L을 쏟아내려 합니다.
    *   **AI 판단:** "거스를 수 없는 힘이 작용한다. 단기 추세가 반대라도 장기적으로는 **이쪽(L)으로 쏠릴 수밖에 없다.**"
2.  **Balanced:**
    *   오차가 2% 미만입니다.
    *   **AI 판단:** "균형 상태다. 장기적 힘보다는 단기적 기세(Bot 02, 06)를 따르자."

---

## Bot 12: Z-Score 거시 지표 (Macro Z-Score)
**목표:** 통계학적 표준 편차(Sigma)를 사용하여, 현재 상태가 **얼마나 비정상적인지(Abnormal)**를 0.0~3.0 사이의 점수로 평가합니다.

### `summary_text` 예시
```text
Z-Score Macro Analysis (30-Day Data):
[Direction L/R]
- Z-Score: 2.15 -> Over-extended (High)

[Line 3/4]
- Z-Score: -0.50 -> Balanced

[Odd/Even O/E]
- Z-Score: 0.12 -> Balanced

Focus: Statistical abnormalities on a massive scale (Law of Large Numbers Extreme).
```

### 💡 AI 분석 포인트 (과열 경고)
이 데이터는 AI에게 **"지금이 통계적으로 말이 되는 상황인가?"**를 경고합니다.
1.  **Over-extended (High/Low) (|Z| > 1.96):**
    *   통계적으로 95% 신뢰구간을 벗어난 이상 현상입니다.
    *   **AI 판단:** "비정상이다. 곧 제자리로 돌아올 것이다(Mean Reversion). **역베팅(Reverse)을 준비해라.**"
2.  **Balanced:**
    *   정상 범위 내의 변동입니다.
    *   **AI 판단:** "특이 사항 없음."

---

## Bot 13: 패턴 회귀 매칭 (Similarity Regression)
**목표:** **"역사는 반복된다"**는 전제 하에, 30일간의 방대한 데이터베이스에서 현재(36시간)와 가장 유사한 과거 구간(Similarity Chunk)을 찾아냅니다.

### `summary_text` 예시
```text
Regression/Similarity Pattern (Chunk Matching):
[Direction L/R]
- Best Match Diff: 2.5
- Predicted Next: L

[Line 3/4]
- Best Match Diff: 8.0
- Predicted Next: Opposite

[Odd/Even O/E]
- Best Match Diff: 1.2
- Predicted Next: Odd

Focus: Using long-term history to find the 'closest' historical scenario and its outcome.
```

### 💡 AI 분석 포인트 (데자뷰 매매)
이 데이터는 AI에게 **"과거의 정답지"**를 몰래 보여줍니다.
1.  **Best Match Diff가 낮을수록(유사할수록):**
    *   `Diff: 1.2`는 과거와 거의 똑같은 그림을 찾았다는 뜻입니다.
    *   **AI 판단:** "소름 돋게 똑같다. 과거에 홀이 나왔으니 이번에도 **홀(Odd)이 나올 확률이 매우 높다.**"
2.  **Diff가 높으면:**
    *   비슷한 그림을 못 찾았습니다.
    *   **AI 판단:** "참고는 하되, 맹신하지 마라."

---

## Bot 14: 거대 파동 사이클 (Giant Cycle Wave)
**목표:** 3~5일 단위의 **초장기 파동(Grand Cycle)**을 분석하여, 현재가 대세 상승장(Bull)인지 대세 하락장(Bear)인지 판별합니다.

### `summary_text` 예시
```text
Giant Cycle Analysis (Global Trend):
[Direction L/R]
- Phase: Expansion Phase (Bull) (MA100=0.55 vs MA500=0.51)

[Line 3/4]
- Phase: Neutral (MA100=0.50 vs MA500=0.50)

[Odd/Even O/E]
- Phase: Contraction Phase (Bear) (MA100=0.45 vs MA500=0.49)

Focus: Identifying major multi-day trends (Expansion vs Contraction).
```

### 💡 AI 분석 포인트 (대세 판단)
이 데이터는 AI에게 **"지금 숲(Forest)이 어디로 움직이는가?"**를 알려줍니다.
1.  **Expansion (Bull):**
    *   장기 이평선 위에서 단기 에너지가 폭발하고 있습니다.
    *   **AI 판단:** "대세는 상승이다. 자질구레한 꺾기 시도하지 말고 **줄을 타라.**"
2.  **Contraction (Bear):**
    *   에너지가 죽어가고 있습니다.
    *   **AI 판단:** "보수적으로 접근해라."

---

## Bot 15: 희소 패턴 경보 (Rare Pattern Detector)
**목표:** 30일 동안 몇 번 나올까 말까 한 **희귀 패턴(Black Swan events)**이 현재 발생하고 있는지 감시합니다.

### `summary_text` 예시
```text
Rare Pattern Detector (Alert System):
[Direction L/R]
- Max Streak Found: 12
- Status: CRITICAL WARNING: Rare Streak (12) Detected!

[Line 3/4]
- Max Streak Found: 2
- Status: No rare patterns.

[Odd/Even O/E]
- Max Streak Found: 3
- Status: No rare patterns.

Focus: If a rare pattern is active, tread carefully or bet on breakage.
```

### 💡 AI 분석 포인트 (위험 회피 및 기회 포착)
이 데이터는 AI에게 **"지금 비상 상황인가?"**를 긴급 타전합니다.
1.  **CRITICAL WARNING:**
    *   `Streak 12`와 같은 롱 줄이나 퐁당 등 희귀 상황이 터졌습니다.
    *   **AI 판단:** "비상이다. 일반적인 통계가 무너지는 구간이다. **절대 반대로 꺾지 마라(Don't Fade).** 줄이 끊어질 때까지 같이 타거나, 아예 쉬어라." (깡통 계좌 방지용)

---

## Phase 2, 3, 4: 메타 분석 및 최종 결정 (Meta-Bots)
*Bot 16~20은 위에서 생성된 `summary_text`를 읽고 판단하는 **심사위원(Evaluator)** 역할입니다. 이들은 독자적인 Summary Text를 생성하지 않고, 최종 예측(Prediction)만을 출력합니다.*

### 🤖 Bot 16 (Short-Term Evaluator), Bot 17 (Mid-Term), Bot 18 (Long-Term)
*   **역할:** 각 그룹(단기/중기/장기)에 속한 5명의 봇들의 의견을 듣고 **그룹 대표 의견**을 정합니다.
*   **AI의 사고 과정:** "단기 봇들이 대체로 L을 외치는데, 3번 봇만 R이라고 하네? 3번 봇의 신뢰도가 낮으니 **L로 의견 통일.**"

### 🌍 Bot 19 (Global Sentiment)
*   **역할:** ST, MT, LT 그룹의 의견을 모두 모아 **시장 전체의 분위기**를 읽습니다.
*   **AI의 사고 과정:** "단기는 L(상승)인데, 장기는 R(하락)이네? 지금 변곡점이구나. **Risk Level을 'HIGH'로 올리고 베팅 금액을 줄이자.**"

### 👑 Bot 20 (Master Decision Maker)
*   **역할:** 최종적으로 **단 하나의 Pick**을 결정합니다.
*   **AI의 사고 과정:** "모든 보고를 종합했을 때, **오늘의 확실한 승부처는 '3줄(Line 3)'이다.** Direction과 Odd/Even은 패스하고, 3줄에 집중 투자한다."





