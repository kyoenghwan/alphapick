import { NextRequest, NextResponse } from "next/server";

/**
 * 과거 데이터 마이그레이션을 실행하는 API 라우트입니다.
 * 클라이언트(어드민 상세조회 페이지 등)에서 날짜를 지정하여 마이그레이션을 요청하면
 * 백엔드 Cloud Function을 호출하여 실제 수집 작업을 수행합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { date, gameCode, runHeadless } = await request.json();

    // 1. 필수 파라미터 체크
    if (!date || !gameCode) {
      return NextResponse.json(
        { error: "날짜와 게임 코드가 필요합니다." },
        { status: 400 }
      );
    }

    // 2. 날짜 형식 검증 (YYYYMMDD)
    if (!/^\d{8}$/.test(date)) {
      return NextResponse.json(
        { error: "날짜 형식이 올바르지 않습니다. YYYYMMDD 형식이어야 합니다." },
        { status: 400 }
      );
    }

    // 3. Cloud Function 호출 정보 설정
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "alphapick-a9b9e";
    const isDev = process.env.NODE_ENV === "development";
    const useEmulator = isDev || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
    const emulatorHost = "127.0.0.1:5001";

    const functionUrl =
      process.env.MIGRATION_FUNCTION_URL ||
      (useEmulator
        ? `http://${emulatorHost}/${projectId}/us-central1/migrateHistoricalData`
        : `https://us-central1-${projectId}.cloudfunctions.net/migrateHistoricalData`);

    console.log("--------------------------------------------------");
    console.log(`[Proxy API] Migration Request`);
    console.log(`- Date: ${date}`);
    console.log(`- GameCode: ${gameCode}`);
    console.log(`- Headless: ${!!runHeadless}`);
    console.log(`- Target URL: ${functionUrl}`);
    console.log(`- Environment: ${isDev ? "Development" : "Production"}`);
    console.log(`- Using Emulator: ${useEmulator}`);
    console.log("--------------------------------------------------");

    try {
      // 4. Cloud Function 호출
      // dateStr, gameCode, headless 여부를 함께 전달합니다.
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          gameCode,
          headless: !!runHeadless, // 불리언 보장
        }),
      });

      console.log(`[Proxy API] Cloud Function Response Status: ${response.status}`);

      // 5. 응답 상태 코드 확인 및 에러 처리
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          // 응답이 HTML(오류 페이지)인 경우와 JSON인 경우를 구분하여 파싱합니다.
          if (errorText.trim().startsWith('<')) {
            const isFirebaseError = errorText.includes('Firebase') || errorText.includes('google');
            throw new Error(
              `Cloud Function 응답이 HTML입니다(상태코드: ${response.status}). ` +
              (isFirebaseError ? "Firebase Functions 엔드포인트가 정확한지, 또는 함수가 배포되었는지 확인하세요." : "엔드포인트가 정확한지 확인하세요.")
            );
          }
          errorData = JSON.parse(errorText);
        } catch (parseError: any) {
          if (errorText.includes('<html>') || errorText.includes('<!DOCTYPE')) {
            throw new Error(`Firebase Functions가 배포되지 않았거나 엔드포인트가 틀렸습니다. (URL: ${functionUrl})`);
          }
          errorData = { error: errorText || parseError.message || "마이그레이션 실행 중 실패" };
        }
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // 6. 성공 결과 반환
      return NextResponse.json({
        success: true,
        collected: result.collected || 0,
        message: result.message || "마이그레이션이 완료되었습니다.",
      });
    } catch (fetchError: any) {
      console.error("Cloud Function 통신 오류:", {
        message: fetchError.message,
        stack: fetchError.stack,
        url: functionUrl
      });

      // 네트워크 연결이나 CORS 설정 문제 등으로 요청 자체가 실패한 경우
      const isConnectionError =
        fetchError.message.includes("ECONNREFUSED") ||
        fetchError.message.includes("Failed to fetch") ||
        fetchError.message.includes("fetch failed") ||
        fetchError.code === "ECONNREFUSED";

      if (isConnectionError) {
        return NextResponse.json(
          {
            error: "Cloud Function 서버(에뮬레이터)에 연결할 수 없습니다.",
            message: `대상 URL: ${functionUrl}`,
            hint: "터미널에서 'firebase emulators:start'가 실행 중인지, 그리고 Functions 에뮬레이터가 5001 포트를 사용 중인지 확인해 주세요.",
            details: fetchError.message
          },
          { status: 503 }
        );
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error("마이그레이션 API 전체 오류 상세:", {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      {
        error: error.message || "내부 서버 오류가 발생했습니다.",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

