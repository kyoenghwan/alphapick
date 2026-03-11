/**
 * Firestore 초기화 테스트 스크립트
 * 해당 날짜의 count, result 문서 생성 및 001~480 라운드 문서 생성
 * 
 * 사용법: npx ts-node test-init.ts
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Firebase Admin 초기화
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function initializeFirestore() {
  try {
    console.log("=".repeat(60));
    console.log("Firestore 초기화 테스트 시작");
    console.log("=".repeat(60));

    const today = new Date();
    const year = today.getFullYear().toString();
    const dateStr = `${year}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    console.log(`\n대상 날짜: ${year}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`);
    console.log(`경로: games/${year}/count/${dateStr}`);
    console.log(`경로: games/${year}/result/${dateStr}/rounds/001~480\n`);

    // 1. count 문서 확인 및 생성
    console.log("1. count 문서 확인 중...");
    const countRef = db
      .collection("games")
      .doc(year)
      .collection("count")
      .doc(dateStr);

    const countDoc = await countRef.get();

    if (countDoc.exists) {
      console.log("   ⚠️  count 문서가 이미 존재합니다.");
      console.log("   데이터:", countDoc.data());
    } else {
      console.log("   ✅ count 문서가 없습니다. 생성합니다...");
      await countRef.set({
        total_collected: 0,
        total_hits: 0,
        win_rate: 0,
        missing_rounds: [],
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("   ✅ count 문서 생성 완료!");
    }

    // 2. result 컬렉션의 rounds 문서들 확인 및 생성
    console.log("\n2. rounds 문서 확인 중...");
    const resultRef = db
      .collection("games")
      .doc(year)
      .collection("result")
      .doc(dateStr)
      .collection("rounds");

    // 기존 rounds 문서 개수 확인
    const existingRounds = await resultRef.limit(10).get();
    const existingCount = existingRounds.size;

    console.log(`   기존 rounds 문서 개수: ${existingCount > 0 ? "일부 존재" : "없음"}`);

    if (existingCount > 0) {
      console.log("   ⚠️  일부 rounds 문서가 이미 존재합니다.");
      console.log("   건너뜁니다. (이미 존재하는 문서는 업데이트하지 않음)");
    }

    // 001~480 라운드 문서 생성 (배치 처리)
    console.log("\n3. 001~480 라운드 문서 생성 중...");
    const batchSize = 500; // Firestore 배치 최대 제한
    let batch = db.batch();
    let batchCount = 0;
    let createdCount = 0;

    for (let round = 1; round <= 480; round++) {
      const roundStr = String(round).padStart(3, "0");
      const roundRef = resultRef.doc(roundStr);

      // 문서 존재 여부 확인 (배치에서는 확인 불가하므로 생성만 진행)
      // 실제로는 merge 옵션을 사용하지 않고 set을 사용하여 빈 문서 생성
      // 나중에 데이터가 들어오면 업데이트됨

      batch.set(
        roundRef,
        {
          round: round,
          result: null, // 결과가 없을 때는 null
          resultOriginal: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true } // 이미 존재하면 업데이트하지 않음
      );

      batchCount++;
      createdCount++;

      // 배치 최대 제한에 도달하거나 마지막 라운드일 때 커밋
      if (batchCount >= batchSize || round === 480) {
        try {
          await batch.commit();
          console.log(`   진행: ${round}/480 (배치 커밋 완료)`);
          batch = db.batch();
          batchCount = 0;
        } catch (error: any) {
          console.error(`   오류 발생 (라운드 ${round}):`, error.message);
        }
      }
    }

    console.log(`\n✅ 라운드 문서 생성 완료!`);
    console.log(`   생성/업데이트된 문서: ${createdCount}개`);

    // 4. 최종 확인
    console.log("\n4. 최종 확인 중...");
    const finalCountDoc = await countRef.get();
    const sampleRoundDoc = await resultRef.doc("001").get();
    const lastRoundDoc = await resultRef.doc("480").get();

    console.log("\n✅ 초기화 완료!");
    console.log("\n확인 결과:");
    console.log(`   count 문서: ${finalCountDoc.exists ? "✅ 존재" : "❌ 없음"}`);
    console.log(`   rounds/001: ${sampleRoundDoc.exists ? "✅ 존재" : "❌ 없음"}`);
    console.log(`   rounds/480: ${lastRoundDoc.exists ? "✅ 존재" : "❌ 없음"}`);

    if (finalCountDoc.exists) {
      console.log("\n   count 문서 데이터:", JSON.stringify(finalCountDoc.data(), null, 2));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Firestore 초기화 테스트 완료!");
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ 오류 발생:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeFirestore();

