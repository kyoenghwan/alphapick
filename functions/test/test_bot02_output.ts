
import { Gen_BOT02_Pongdang } from '../src/pipeline/02_summary_gen/generators/Gen_BOT02_Pongdang';

const generateMockData = () => {
    // Generate 150 rounds of mock data
    // Pattern: L, R, L, R, L, R (Pongdang) mixed with some streaks
    const rounds = [];
    for (let i = 0; i < 150; i++) {
        let dir = i % 2 === 0 ? 'L' : 'R'; // Perfect Pongdang for Direction
        let line = i % 4 === 0 ? '3' : '4'; // Some streakiness for Line
        let oe = i < 130 ? (i % 2 === 0 ? 'O' : 'E') : 'O'; // Broken Pongdang at end for OE
        rounds.push(`${dir}${line}${oe}`);
    }
    return rounds;
};

const runTest = () => {
    const generator = new Gen_BOT02_Pongdang();
    const mockData = generateMockData();
    const result = generator.generate(mockData);

    console.log("=== Bot 02 Output Analysis ===");
    console.log("Bot ID:", result.botId);
    console.log("\n[Layer 1: Macro Stats]");
    console.log(JSON.stringify(result.layer1_macro, null, 2));
    console.log("\n[Layer 2: Summary Text]");
    console.log(result.layer2_rolling.summary_text);
    console.log("\n[Sample Raw Data (Last 5)]");
    console.log(result.layer3_raw.slice(-5));
};

runTest();
