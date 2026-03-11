import { IPipelineSummary } from "../../types";

/**
 * 봇 요약 생성기 인터페이스
 * 모든 개별 봇 생성기는 이 인터페이스를 구현해야 합니다.
 */
export interface IBotSummaryGenerator {
    /**
     * 실행 함수
     * @param allRounds 전체 게임 데이터 (과거 -> 최신 순)
     * @returns 해당 봇의 요약 정보 (IPipelineSummary)
     */
    generate(allRounds: string[]): IPipelineSummary;
}
