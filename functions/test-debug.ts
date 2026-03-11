/**
 * 디버깅용 스크립트 - span 요소의 실제 내용 확인
 */

import * as puppeteer from "puppeteer";

async function debugScraper() {
  let browser: puppeteer.Browser | null = null;

  try {
    console.log("브라우저 시작...");
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );

    console.log("페이지 로딩 중...");
    await page.goto("https://bepick.net/live/bubbleladder", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("데이터 추출 중...");
    const debugInfo = await page.evaluate(() => {
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

      const h3Element = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3'
      );
      const span1 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[1]'
      );
      const span2 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[2]'
      );
      const span3 = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/div/span[3]'
      );

      return {
        h3: h3Element
          ? {
              textContent: h3Element.textContent,
              innerHTML: h3Element.innerHTML,
              outerHTML: h3Element.outerHTML.substring(0, 200),
            }
          : null,
        span1: span1
          ? {
              textContent: span1.textContent,
              innerHTML: span1.innerHTML,
              className: span1.className,
              outerHTML: span1.outerHTML.substring(0, 200),
              attributes: Array.from(span1.attributes).map((attr) => ({
                name: attr.name,
                value: attr.value,
              })),
            }
          : null,
        span2: span2
          ? {
              textContent: span2.textContent,
              innerHTML: span2.innerHTML,
              className: span2.className,
              outerHTML: span2.outerHTML.substring(0, 200),
              attributes: Array.from(span2.attributes).map((attr) => ({
                name: attr.name,
                value: attr.value,
              })),
            }
          : null,
        span3: span3
          ? {
              textContent: span3.textContent,
              innerHTML: span3.innerHTML,
              className: span3.className,
              outerHTML: span3.outerHTML.substring(0, 200),
              attributes: Array.from(span3.attributes).map((attr) => ({
                name: attr.name,
                value: attr.value,
              })),
            }
          : null,
      };
    });

    console.log("\n=== 디버깅 정보 ===");
    console.log("\nH3 요소:");
    console.log(JSON.stringify(debugInfo.h3, null, 2));
    console.log("\nSpan1 요소:");
    console.log(JSON.stringify(debugInfo.span1, null, 2));
    console.log("\nSpan2 요소:");
    console.log(JSON.stringify(debugInfo.span2, null, 2));
    console.log("\nSpan3 요소:");
    console.log(JSON.stringify(debugInfo.span3, null, 2));

    console.log("\n5초 후 브라우저를 닫습니다...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await browser.close();
  } catch (error: any) {
    console.error("오류:", error);
    if (browser) await browser.close();
  }
}

debugScraper();

