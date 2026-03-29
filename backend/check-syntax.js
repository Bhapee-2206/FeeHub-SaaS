const fs = require('fs');
const html = fs.readFileSync('c:/Users/acer/Desktop/feehub-saas f/frontend/dashboard.html', 'utf8');


const match = html.match(/<script>(.*?)<\/script>/s);
if (match) {
    const code = match[1];
    try {
        new Function(code);
        console.log("Script 1 OK");
    } catch (e) {
        console.error("Script 1 ERROR:", e);
    }
} else {
    console.log("No script 1 found");
}

const allScripts = [...html.matchAll(/<script>((?:.|\n)*?)<\/script>/g)];
allScripts.forEach((match, index) => {
    try {
        new Function(match[1]);
        console.log(`Script ${index} OK`);
    } catch (e) {
        console.error(`Script ${index} ERROR:`, e.message, "\nCode snippet:", match[1].substring(0, 100));
    }
});
