/**
 * Firestore 실제 저장 테스트 스크립트
 * 실제 Firestore에 데이터를 저장하고 확인합니다
 * 
 * 사용법: npx ts-node test-firestore.ts
 */

import * as admin from "firebase-admin";
import * as puppeteer from "puppeteer";
import * as path from "path";

// Firebase Admin 초기화 (서비스 계정 키 파일 사용)
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testFirestoreStorage() {
  let browser: puppeteer.Browser | null = null;

  try {
    console.log("=".repeat(60));
    console.log("Firestore 저장 테스트 시작");
    console.log("=".repeat(60));

    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
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

      // 회차 추출
      let round: number | null = null;
      const h3Element = getElementByXPath(
        '//*[@id="wrapper"]/div/div[5]/div/div[2]/ul/li[1]/h3'
      );
      if (h3Element) {
        const h3Text = h3Element.textContent?.trim() || "";
        const match = h3Text.match(/-?\s*(\d+)\s*$/);
        if (match) {
          round = parseInt(match[1], 10);
        }
      }

      // 결과 추출
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
        const getAfterContent = (element: Element): string => {
          const styles = window.getComputedStyle(element, "::after");
          const content = styles.content;
          return content.replace(/^["']|["']$/g, "");
        };

        const value1 = getAfterContent(span1);
        const value2 = getAfterContent(span2);
        const value3 = getAfterContent(span3);

        if (value1 && value2 && value3) {
          // value2에서 "줄" 글자 제거
          const cleanedValue2 = value2.replace(/줄/g, "");
          
          const originalResult = `${value1}${cleanedValue2}${value3}`;

          const convertToR4O = (v1: string, v2: string, v3: string): string => {
            const direction = v1.includes("우") ? "R" : "L";
            const number = v2.replace(/[^0-9]/g, "");
            const oddEven = v3.includes("홀") ? "O" : "X";
            return `${direction}${number}${oddEven}`;
          };

          const convertedResult = convertToR4O(value1, cleanedValue2, value3);

          result = JSON.stringify({
            original: originalResult,
            converted: convertedResult,
          });
        }
      }

      return { round, result };
    });

    await browser.close();
    browser = null;

    if (!roundAndResult.round || !roundAndResult.result) {
      console.log("❌ 데이터 추출 실패");
      return;
    }

    // JSON 파싱
    let resultData: { original: string; converted: string };
    try {
      resultData = JSON.parse(roundAndResult.result);
    } catch (e) {
      console.log("❌ 결과 데이터 파싱 실패");
      return;
    }

    console.log("3. 추출된 데이터:");
    console.log(`   회차: ${roundAndResult.round}`);
    console.log(`   원본 결과: ${resultData.original}`);
    console.log(`   변환된 결과: ${resultData.converted}\n`);

    const round = roundAndResult.round;

    // 날짜 정보 추출
    const today = new Date();
    const year = today.getFullYear().toString();
    const dateStr = `${year}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const roundStr = String(round).padStart(3, "0"); // 001, 002 형식

    // Firestore에서 중복 확인
    console.log("4. Firestore 중복 확인 중...");
    const gameRef = db
      .collection("games")
      .doc(year)
      .collection("result")
      .doc(dateStr)
      .collection("rounds")
      .doc(roundStr);
    const gameDoc = await gameRef.get();

    if (gameDoc.exists) {
      console.log(`⚠️  회차 ${round} 데이터가 이미 존재합니다.`);
      console.log("   기존 데이터:", gameDoc.data());
      console.log("\n5초 후 종료합니다...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return;
    }

    // count 문서 확인
    const countRef = db
      .collection("games")
      .doc(year)
      .collection("count")
      .doc(dateStr);
    const countDoc = await countRef.get();

    // 데이터 저장
    console.log("5. Firestore에 데이터 저장 중...");
    const batch = db.batch();

    // games/{YYYY}/result/{YYYYMMDD}/rounds/{Round_No} 문서 저장
    batch.set(gameRef, {
      round: round,
      result: resultData.converted, // R4O 형식 (예: "R4O")
      resultOriginal: resultData.original, // 원본 결과 (예: "우4짝")
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // games/{YYYY}/count/{YYYYMMDD} 문서의 통계 업데이트
    const countUpdateData: any = {
      total_collected: admin.firestore.FieldValue.increment(1),
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 문서가 없으면 초기값 설정
    if (!countDoc.exists) {
      countUpdateData.total_hits = 0;
      countUpdateData.win_rate = 0;
      countUpdateData.missing_rounds = [];
    }

    batch.set(countRef, countUpdateData, { merge: true });

    await batch.commit();
    console.log("✅ 데이터 저장 완료!\n");

    // 저장된 데이터 확인
    console.log("6. 저장된 데이터 확인 중...");
    const savedDoc = await gameRef.get();
    if (savedDoc.exists) {
      console.log("✅ rounds 문서 저장 확인:");
      console.log("   경로: games/" + year + "/result/" + dateStr + "/rounds/" + roundStr);
      console.log("   데이터:", JSON.stringify(savedDoc.data(), null, 2));
    } else {
      console.log("❌ 저장 확인 실패: 문서를 찾을 수 없습니다");
    }

    // 통계 확인
    const savedCountDoc = await countRef.get();
    if (savedCountDoc.exists) {
      console.log("\n✅ count 문서 저장 확인:");
      console.log("   경로: games/" + year + "/count/" + dateStr);
      console.log("   데이터:", JSON.stringify(savedCountDoc.data(), null, 2));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Firestore 저장 테스트 완료!");
    console.log("=".repeat(60));

    console.log("\n5초 후 종료합니다...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
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
  } finally {
    process.exit(0);
  }
}

testFirestoreStorage();

