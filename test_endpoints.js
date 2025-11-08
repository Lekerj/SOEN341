const http = require("http");

// Test admin analytics endpoint
function testAdminAnalytics() {
  return new Promise((resolve, reject) => {
    // First, login as admin
    const loginData = JSON.stringify({
      email: "admin@conevents.com",
      password: "password123"
    });

    const loginReq = http.request({
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginData),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const cookies = res.headers["set-cookie"] || [];
        const sessionCookie = cookies.find(c => c.includes("sessionid") || c.includes("sid"));

        if (!sessionCookie) {
          console.log("❌ Login failed, no session cookie");
          console.log("Response:", data);
          resolve({ success: false });
          return;
        }

        // Extract cookie value
        const cookieValue = sessionCookie.split(";")[0];

        // Now test admin analytics
        const analyticsReq = http.request({
          hostname: "localhost",
          port: 3000,
          path: "/api/admin/analytics?eventId=9",
          method: "GET",
          headers: {
            Cookie: cookieValue,
          },
        }, (res) => {
          let analyticsData = "";
          res.on("data", chunk => analyticsData += chunk);
          res.on("end", () => {
            console.log("\n=== ADMIN ANALYTICS TEST ===");
            console.log("Status:", res.statusCode);
            if (res.statusCode === 200) {
              console.log("✓ Admin can access analytics");
              resolve({ success: true, status: res.statusCode });
            } else {
              console.log("✗ Failed to access admin analytics");
              console.log("Response:", analyticsData);
              resolve({ success: false, status: res.statusCode });
            }
          });
        });

        analyticsReq.on("error", reject);
        analyticsReq.end();
      });
    });

    loginReq.on("error", reject);
    loginReq.write(loginData);
    loginReq.end();
  });
}

// Test organizer event endpoint
function testOrganizerEvent() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      email: "john@test.com",
      password: "password123"
    });

    const loginReq = http.request({
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginData),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const cookies = res.headers["set-cookie"] || [];
        const sessionCookie = cookies.find(c => c.includes("sessionid") || c.includes("sid"));

        if (!sessionCookie) {
          console.log("❌ Login failed for organizer");
          resolve({ success: false });
          return;
        }

        const cookieValue = sessionCookie.split(";")[0];

        // Test organizer event endpoint
        const eventReq = http.request({
          hostname: "localhost",
          port: 3000,
          path: "/api/organizer/events/9",
          method: "GET",
          headers: {
            Cookie: cookieValue,
          },
        }, (res) => {
          let eventData = "";
          res.on("data", chunk => eventData += chunk);
          res.on("end", () => {
            console.log("\n=== ORGANIZER EVENT ENDPOINT TEST ===");
            console.log("Status:", res.statusCode);
            if (res.statusCode === 200 || res.statusCode === 403) {
              // 403 is acceptable if organizer doesn't own the event
              console.log(res.statusCode === 200 ? "✓ Organizer can access event" : "✓ Organizer endpoint returns 403 (not owner)");
              resolve({ success: true, status: res.statusCode });
            } else if (res.statusCode === 404) {
              console.log("✗ Event endpoint returned 404 - route issue!");
              console.log("Response:", eventData);
              resolve({ success: false, status: res.statusCode });
            } else {
              console.log("Response:", eventData);
              resolve({ success: true, status: res.statusCode });
            }
          });
        });

        eventReq.on("error", reject);
        eventReq.end();
      });
    });

    loginReq.on("error", reject);
    loginReq.write(loginData);
    loginReq.end();
  });
}

// Test organizer analytics endpoint
function testOrganizerAnalytics() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      email: "john@test.com",
      password: "password123"
    });

    const loginReq = http.request({
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginData),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const cookies = res.headers["set-cookie"] || [];
        const sessionCookie = cookies.find(c => c.includes("sessionid") || c.includes("sid"));

        if (!sessionCookie) {
          console.log("❌ Login failed for organizer analytics");
          resolve({ success: false });
          return;
        }

        const cookieValue = sessionCookie.split(";")[0];

        // Test organizer analytics endpoint
        const analyticsReq = http.request({
          hostname: "localhost",
          port: 3000,
          path: "/api/organizer/events/1/analytics",
          method: "GET",
          headers: {
            Cookie: cookieValue,
          },
        }, (res) => {
          let analyticsData = "";
          res.on("data", chunk => analyticsData += chunk);
          res.on("end", () => {
            console.log("\n=== ORGANIZER ANALYTICS ENDPOINT TEST ===");
            console.log("Status:", res.statusCode);
            if (res.statusCode === 200) {
              console.log("✓ Organizer can access analytics");
              resolve({ success: true, status: res.statusCode });
            } else if (res.statusCode === 404) {
              console.log("✗ Analytics endpoint returned 404 - route issue!");
              console.log("Response:", analyticsData);
              resolve({ success: false, status: res.statusCode });
            } else {
              console.log("Status:", res.statusCode);
              console.log("Response:", analyticsData);
              resolve({ success: true, status: res.statusCode });
            }
          });
        });

        analyticsReq.on("error", reject);
        analyticsReq.end();
      });
    });

    loginReq.on("error", reject);
    loginReq.write(loginData);
    loginReq.end();
  });
}

async function runTests() {
  console.log("Testing endpoints...\n");

  try {
    const adminTest = await testAdminAnalytics();
    const orgEventTest = await testOrganizerEvent();
    const orgAnalyticsTest = await testOrganizerAnalytics();

    console.log("\n=== TEST SUMMARY ===");
    console.log("Admin Analytics:", adminTest.success ? "✓ PASS" : "✗ FAIL");
    console.log("Organizer Event:", orgEventTest.success ? "✓ PASS" : "✗ FAIL");
    console.log("Organizer Analytics:", orgAnalyticsTest.success ? "✓ PASS" : "✗ FAIL");

    if (adminTest.success && orgEventTest.success && orgAnalyticsTest.success) {
      console.log("\n✓ All tests passed!");
      process.exit(0);
    } else {
      console.log("\n✗ Some tests failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("Test error:", error);
    process.exit(1);
  }
}

runTests();
