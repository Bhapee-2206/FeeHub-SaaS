async function testEndpoints() {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzY5MWVjNWI5MDhjYTE5MjYxZjFhNSIsInJvbGUiOiJJbnN0aXR1dGlvbkFkbWluIiwiaW5zdGl0dXRpb25JZCI6IjY5YmU3NjEzZDkyMzRjYWYwNTIzNjNlMSIsImlhdCI6MTc0MDI5MjI0MSwiZXhwIjoxNzQyODg0MjQxfQ.m22-S0E";
    
    
    
    const loginRes = await fetch('http:
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'director@feehub.com', password: 'master123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.log("Could not log in");
        return;
    }
    const realToken = loginData.token;
    console.log("Logged in");

    const routes = [
        '/api/dashboard/stats',
        '/api/students',
        '/api/payments',
        '/api/fee-structures',
        '/api/courses',
        '/api/staff',
        '/api/superadmin/institutions'
    ];
    
    for (let route of routes) {
        console.log("Hitting " + route);
        try {
            const res = await fetch('http:
                headers: { 'Authorization': 'Bearer ' + realToken }
            });
            console.log(route + " => " + res.status);
            const data = await res.json();
        } catch (e) {
            console.error(e);
        }
    }
}
testEndpoints();
