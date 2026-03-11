
export interface IPipelineGameData {
    timestamp: number;
    gameId: string;
    targetDate: string;
    // 30일치 전체 원시 데이터 (Oldest -> Newest 정렬 권장 for Rolling Calc)
    // 하지만 사용자 요청에 따라 "Newest -> Oldest" 정렬 여부를 옵션으로 둘 수도 있음.
    // 여기서는 로직 처리에 편리한 Ascending(과거->최신)으로 저장하고, 
    // Raw View용으로 Descending이 필요하면 별도 필드를 두거나 뒤집어서 사용.
    allRounds: string[]; // "L3O", "R4X", ... (Oldest first: index 0 is 30 days ago)

    // 메타데이터
    datasetInfo: {
        startDate: string;
        endDate: string;
        totalCount: number;
    };
    originalData?: any; // Raw daily object array (optional)
}

export interface IPipelineSummary {
    botId: string;
    layer1_macro: any; // Bot specific macro stats
    layer2_rolling: any; // Bot specific rolling stats
    layer3_raw: string[]; // Raw data snippet for prompt
}

export interface IPipelinePrompt {
    botId: string;
    promptText: string;
}

export interface IPipelineResult {
    botId: string;
    prediction: string;
    confidence: number;
    risk_level: string;
    reason: string;
}
