
// Mock Interfaces
interface IPipelineSummary {
    botId: string;
    layer1_macro: {
        today_l_prob: number;
        today_3_prob: number;
        today_o_prob: number;
    };
    layer2_rolling: {
        summary_text: string;
    };
    layer3_raw: string[];
}
interface IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary;
}

// Paste Gen_BOT03 code here (modified removing exports/imports)
class Gen_BOT03_EMA implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_03";
        const ROLLING_WINDOW = 180;
        const RAW_WINDOW = 30;

        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);

        // Helper for EMA
        const calcEMA = (data: number[], period: number) => {
            const k = 2 / (period + 1);
            let ema = data[0];
            for (let i = 1; i < data.length; i++) {
                ema = (data[i] * k) + (ema * (1 - k));
            }
            return ema;
        };

        const numD = rollingData.map(r => r.includes('L') ? 1 : -1);
        const numL = rollingData.map(r => r.includes('3') ? 1 : -1);
        const numO = rollingData.map(r => r.includes('O') ? 1 : -1);

        const emaD = calcEMA(numD, 12);
        const emaL = calcEMA(numL, 12);
        const emaO = calcEMA(numO, 12);

        const getSignal = (val: number, labelPlus: string, labelMinus: string) => {
            let trend = "Neutral";
            if (val > 0.55) trend = `Strong ${labelPlus}`;
            else if (val < -0.55) trend = `Strong ${labelMinus}`;
            else if (val > 0.1) trend = `Weak ${labelPlus}`;
            else if (val < -0.1) trend = `Weak ${labelMinus}`;

            return { val: (val * 100).toFixed(1), trend };
        };

        const sD = getSignal(emaD, 'L', 'R');
        const sL = getSignal(emaL, '3', '4');
        const sO = getSignal(emaO, 'Odd', 'Even');

        const summaryText = `EMA Momentum Analysis (Short-Term Trend):
[Direction L/R]
- Value: ${sD.val} (Threshold: +/-10.0)
- Trend: ${sD.trend}

[Line 3/4]
- Value: ${sL.val}
- Trend: ${sL.trend}

[Odd/Even O/E]
- Value: ${sO.val}
- Trend: ${sO.trend}

Focus: Follow the trend if 'Strong', otherwise expect chop.`;

        const total = allRounds.length;
        const lCount = allRounds.filter(r => r.includes('L')).length;
        const line3Count = allRounds.filter(r => r.includes('3')).length;
        const oddCount = allRounds.filter(r => r.includes('O')).length;

        return {
            botId: BOT_ID,
            layer1_macro: {
                today_l_prob: total > 0 ? parseFloat((lCount / total * 100).toFixed(1)) : 0,
                today_3_prob: total > 0 ? parseFloat((line3Count / total * 100).toFixed(1)) : 0,
                today_o_prob: total > 0 ? parseFloat((oddCount / total * 100).toFixed(1)) : 0
            },
            layer2_rolling: { summary_text: summaryText },
            layer3_raw: rawData
        };
    }
}

// Test Harness
const generateMockData = () => {
    const rounds = [];
    for (let i = 0; i < 200; i++) {
        // Direction: Strong L trend recently
        let dir = i > 150 ? 'L' : (i % 2 === 0 ? 'L' : 'R');

        // Line: Weak 4 trend
        let line = i % 3 === 0 ? '3' : '4';

        // OE: Neutral
        let oe = i % 2 === 0 ? 'O' : 'E';

        rounds.push(`${dir}${line}${oe}`);
    }
    return rounds;
};

const runTest = () => {
    const generator = new Gen_BOT03_EMA();
    const mockData = generateMockData();
    const result = generator.generate(mockData);

    console.log("=== Bot 03 Output Analysis ===");
    console.log("Bot ID:", result.botId);
    console.log("\n[Layer 1: Macro Stats]");
    console.log(JSON.stringify(result.layer1_macro, null, 2));
    console.log("\n[Layer 2: Summary Text]");
    console.log(result.layer2_rolling.summary_text);
    console.log("\n[Sample Raw Data (Last 5)]");
    console.log(result.layer3_raw.slice(-5));
};

runTest();
