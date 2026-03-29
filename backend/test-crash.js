const fetch = require('node-fetch');

async function trigger() {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzY5MWVjNWI5MDhjYTE5MjYxZjFhNSIsInJvbGUiOiJJbnN0aXR1dGlvbkFkbWluIiwiaW5zdGl0dXRpb25JZCI6IjY5YmU3NjEzZDkyMzRjYWYwNTIzNjNlMSIsImlhdCI6MTc0MDI5MjI0MSwiZXhwIjoxNzQyODg0MjQxfQ.m22-S0E";
    
    
    
    try {
        const routes = ['/api/dashboard/stats', '/api/students', '/api/payments', '/api/fee-structures', '/api/courses', '/api/staff'];
        
        for (let route of routes) {
            console.log("Hitting " + route);
            
            const res = await fetch('http:
                headers: { }
            });
            console.log(route + ": " + res.status);
        }
    } catch (e) {
        console.log(e);
    }
}
trigger();
