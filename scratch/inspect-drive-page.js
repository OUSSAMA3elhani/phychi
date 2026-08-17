const https = require('https');
const fs = require('fs');

const folderUrl = 'https://drive.google.com/drive/folders/1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';

https.get(folderUrl, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        // Extract all 28-35 char IDs and nearby strings
        const matches = body.match(/[a-zA-Z0-9_-]{28,35}/g) || [];
        const unique = [...new Set(matches)];
        console.log('Unique ID strings found in HTML:', unique.length);
        console.log('Sample IDs:', unique.slice(0, 20));
        process.exit(0);
    });
});
