import * as admin from "firebase-admin";

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "alphapick-a9b9e"
});

const db = admin.firestore();

async function seedAiConfig() {
    const configRef = db.collection("settings").doc("ai_config");

    const defaultConfig = {
        is_enabled: true,
        gemini_api_key: "YOUR_GEMINI_API_KEY_HERE",
        active_st: true,
        active_mt: true,
        active_lt: true,
        active_comp1: true,
        active_comp2: true,
        active_final: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log("Seeding AI Config to Firestore...");

    try {
        await configRef.set(defaultConfig, { merge: true });
        console.log("Successfully seeded AI Config!");
        console.log("Path: settings/ai_config");
    } catch (error) {
        console.error("Error seeding AI Config:", error);
    } finally {
        process.exit(0);
    }
}

seedAiConfig();
