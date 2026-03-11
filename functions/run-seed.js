try {
    require('ts-node').register();
    require('./seed-bots.ts');
} catch (e) {
    console.error('Initialization failed:', e);
    process.exit(1);
}
