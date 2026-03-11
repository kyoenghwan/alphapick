/**
 * 로컬 테스트 스크립트 - 실제 사이트에서 데이터 추출 테스트
 * 사용법: npx ts-node test-scraper.ts
 */

import * as puppeteer from "puppeteer";
import * as fs from "fs";

async function testScraper() {
  let browser: puppeteer.Browser | null = null;

  try {
    console.log("브라우저 시작...");
    browser = await puppeteer.launch({
      headless: false, // 브라우저를 보이게 해서 디버깅 용이
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // User-Agent 설정
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("페이지 로딩 중...");
    await page.goto("https://bepick.net/live/bubbleladder", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("페이지 로드 완료. 데이터 추출 중...");

    // 페이지의 HTML을 파일로 저장 (디버깅용)
    const html = await page.content();
    fs.writeFileSync("page-source.html", html, "utf8");
    console.log("페이지 소스가 page-source.html에 저장되었습니다.");

    // 스크린샷 저장 (디버깅용)
    await page.screenshot({ path: "page-screenshot.png", fullPage: true });
    console.log("스크린샷이 page-screenshot.png에 저장되었습니다.");

    // 데이터 추출 시도
    const result = await page.evaluate(() => {
      // 페이지의 모든 텍스트 노드 검색
      const allText = document.body.innerText;
      console.log("페이지 텍스트 일부:", allText.substring(0, 500));

      // 모든 가능한 요소 찾기
      const allElements = Array.from(document.querySelectorAll("*"));
      const roundCandidates: any[] = [];
      const resultCandidates: any[] = [];

      allElements.forEach((el) => {
        const text = el.textContent?.trim() || "";
        const className = el.className || "";
        const id = el.id || "";

        // 회차 관련 텍스트가 있는 요소 찾기
        if (
          /회차|round|\d+회/.test(text) ||
          /round/.test(className) ||
          /round/.test(id)
        ) {
          roundCandidates.push({
            tag: el.tagName,
            text: text.substring(0, 100),
            className,
            id,
          });
        }

        // 결과 관련 텍스트가 있는 요소 찾기
        if (
          /결과|result|R\d+[A-Z]|O|X/.test(text) ||
          /result/.test(className) ||
          /result/.test(id)
        ) {
          resultCandidates.push({
            tag: el.tagName,
            text: text.substring(0, 100),
            className,
            id,
          });
        }
      });

      return {
        roundCandidates: roundCandidates.slice(0, 20), // 처음 20개만
        resultCandidates: resultCandidates.slice(0, 20), // 처음 20개만
        pageTitle: document.title,
        url: window.location.href,
      };
    });

    console.log("\n=== 페이지 정보 ===");
    console.log("제목:", result.pageTitle);
    console.log("URL:", result.url);

    console.log("\n=== 회차 후보 요소들 ===");
    result.roundCandidates.forEach((item, index) => {
      console.log(`${index + 1}. ${item.tag} - ${item.className || ""} - ${item.text}`);
    });

    console.log("\n=== 결과 후보 요소들 ===");
    result.resultCandidates.forEach((item, index) => {
      console.log(`${index + 1}. ${item.tag} - ${item.className || ""} - ${item.text}`);
    });

    // 이제 실제 추출 로직 테스트
    console.log("\n=== 실제 추출 로직 테스트 ===");
    const extractedData = await page.evaluate(() => {
      const selectors = {
        round: [
          ".round-number",
          "[class*='round']",
          "[class*='회차']",
          "[data-round]",
          "[id*='round']",
        ],
        result: [
          ".result",
          "[class*='result']",
          "[class*='결과']",
          "[data-result]",
          "[id*='result']",
        ],
      };

      let round: number | null = null;
      let result: string | null = null;

      // 회차 추출 시도
      for (const selector of selectors.round) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || "";
          const match = text.match(/(\d+)/);
          if (match) {
            round = parseInt(match[1], 10);
            console.log(`회차 찾음 (셀렉터: ${selector}): ${round}`);
            break;
          }
        }
      }

      // 결과 추출 시도
      for (const selector of selectors.result) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text) {
            result = text;
            console.log(`결과 찾음 (셀렉터: ${selector}): ${result}`);
            break;
          }
        }
      }

      return { round, result };
    });

    console.log("\n=== 추출된 데이터 ===");
    console.log("회차:", extractedData.round);
    console.log("결과:", extractedData.result);

    if (!extractedData.round || !extractedData.result) {
      console.log("\n⚠️  경고: 회차 또는 결과를 추출할 수 없습니다!");
      console.log("page-source.html 파일을 열어서 실제 DOM 구조를 확인하세요.");
      console.log("page-screenshot.png 파일로 화면 구조를 확인하세요.");
    } else {
      console.log("\n✅ 데이터 추출 성공!");
    }

    // 5초 대기 (화면 확인용)
    console.log("\n5초 후 브라우저를 닫습니다...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await browser.close();
    console.log("테스트 완료!");
  } catch (error: any) {
    console.error("오류 발생:", error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

testScraper();

