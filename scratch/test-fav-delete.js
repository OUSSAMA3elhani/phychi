const Favorite = require('../src/models/Favorite');

async function run() {
    console.log('Testing Favorite toggle remove functionality...');
    // Add dummy or test item toggle for user 1
    const res1 = await Favorite.toggle(1, 'course', 1);
    console.log('Toggle 1 result:', res1);

    const res2 = await Favorite.toggle(1, 'course', 1);
    console.log('Toggle 2 (untoggle/delete) result:', res2);

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
