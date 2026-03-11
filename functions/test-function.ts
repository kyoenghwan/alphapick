/**
 * Firebase Function 로컬 테스트 스크립트
 * 실제 Firestore 연동 없이 데이터 수집 로직만 테스트
 * 
 * 사용법: npx ts-node test-function.ts
 */

import * as puppeteer from "puppeteer";

// 실제 함수의 데이터 추출 로직을 시뮬레이션
async function testDataCollection() {
  let browser: puppeteer.Browser | null = null;

  try {
    console.log("=".repeat(50));
    console.log("게임 결과 수집 테스트 시작");
    console.log("=".repeat(50));

    browser = await puppeteer.launch({
      headless: false, // 브라우저를 보이게 설정
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("\n1. 페이지 로딩 중...");
    await page.goto("https://bepick.net/live/bubbleladder", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("✅ 페이지 로드 완료\n");

    console.log("2. 데이터 추출 중...");
    const roundAndResult = await page.evaluate(() => {
      // XPath를 사용하여 요소 찾기
      const getElementByXPath = (xpath: string): Element | null => {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue as Element | null;
      };

      // 회차 추출: //*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3
      let round: number | null = null;
      const h3Element = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3'
      );
      if (h3Element) {
        const h3Text = h3Element.textContent?.trim() || "";
        // "날짜 - 회차" 형식에서 마지막 숫자 추출 (예: "2026.01.04 - 3" → 3)
        const match = h3Text.match(/-?\s*(\d+)\s*$/);
        if (match) {
          round = parseInt(match[1], 10);
        }
      }

      // 결과 추출: 3개의 span에서 ::after 의사 요소의 content 값 읽기
      let result: string | null = null;
      const span1 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[1]'
      );
      const span2 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[2]'
      );
      const span3 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[3]'
      );

      if (span1 && span2 && span3) {
        // ::after 의사 요소의 content 속성 값 읽기
        const getAfterContent = (element: Element): string => {
          const styles = window.getComputedStyle(element, "::after");
          const content = styles.content;
          // content 값에서 따옴표 제거 (예: "좌" → 좌)
          return content.replace(/^["']|["']$/g, "");
        };

        const value1 = getAfterContent(span1); // 좌/우
        const value2 = getAfterContent(span2); // 3/4
        const value3 = getAfterContent(span3); // 홀/짝

        if (value1 && value2 && value3) {
          // 결과를 조합 (예: "좌3홀" 또는 "우4짝")
          result = `${value1}${value2}${value3}`;
        }
      }

      return { round, result };
    });

    await browser.close();
    browser = null;

    console.log("3. 추출 결과:");
    console.log(`   회차: ${roundAndResult.round || "❌ 추출 실패"}`);
    console.log(`   결과: ${roundAndResult.result || "❌ 추출 실패"}\n`);

    if (!roundAndResult.round || !roundAndResult.result) {
      console.log("⚠️  경고: 회차 또는 결과를 추출할 수 없습니다!");
      console.log("실제 사이트의 DOM 구조를 확인하고 셀렉터를 수정해야 합니다.\n");
      return;
    }

    console.log("✅ 데이터 추출 성공!\n");

    // 시뮬레이션: Firestore에 저장할 데이터
    console.log("4. 저장될 데이터 (시뮬레이션):");
    console.log(`   문서 ID: games/${roundAndResult.round}`);
    console.log(`   데이터:`, {
      round: roundAndResult.round,
      result: roundAndResult.result,
      createdAt: "serverTimestamp()",
    });

    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    console.log(`\n   통계 문서: stats/${todayDateStr}`);
    console.log(`   업데이트: total_collected += 1\n`);

    console.log("=".repeat(50));
    console.log("✅ 테스트 완료! 실제 Firebase Function으로 배포할 준비가 되었습니다.");
    console.log("=".repeat(50));
  } catch (error: any) {
    console.error("\n❌ 오류 발생:", error.message);
    console.error(error.stack);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("브라우저 종료 중 오류:", closeError);
      }
    }

    process.exit(1);
  }
}

testDataCollection();

