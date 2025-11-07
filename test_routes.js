const http = require("http");

function makeRequest(path, cookie) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: "localhost",
      port: 3000,
      path: path,
      method: "GET",
      headers: {
        Cookie: cookie,
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on("error", () => {
      resolve({
        status: 500,
        data: "Request error"
      });
    });
    req.end();
  });
}

function login(email, password) {
  return new Promise((resolve) => {
    const loginData = JSON.stringify({ email, password });

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
          resolve(null);
          return;
        }

        const cookieValue = sessionCookie.split(";")[0];
        resolve(cookieValue);
      });
    });

    loginReq.on("error", () => {
      resolve(null);
    });
    loginReq.write(loginData);
    loginReq.end();
  });
}

async function runTests() {
  console.log("🧪 Testing organizer and admin routes\n");

  // Test 1: Organizer accessing their own event
  console.log("Test 1: Organizer accessing their own event (event 1)");
  const johnCookie = await login("john@test.com", "password123");
  if (!johnCookie) {
    console.log("❌ Failed to login as John\n");
  } else {
    const result = await makeRequest("/api/organizer/events/1", johnCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log("✓ PASS: Organizer can access their event\n");
    } else {
      console.log(`✗ FAIL: Got ${result.status}, response: ${result.data.substring(0, 100)}\n`);
    }
  }

  // Test 2: Organizer accessing their own event analytics
  console.log("Test 2: Organizer accessing analytics for their own event (event 1)");
  if (johnCookie) {
    const result = await makeRequest("/api/organizer/events/1/analytics", johnCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log("✓ PASS: Organizer can access analytics for their event\n");
    } else {
      console.log(`✗ FAIL: Got ${result.status}, response: ${result.data.substring(0, 100)}\n`);
    }
  }

  // Test 3: Organizer accessing event they don't own (should return 404)
  console.log("Test 3: Organizer accessing event they don't own (event 9, which belongs to organizer 1017)");
  if (johnCookie) {
    const result = await makeRequest("/api/organizer/events/9", johnCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 404 || result.status === 403) {
      console.log(`✓ PASS: Correct behavior (${result.status}) - access denied to other's event\n`);
    } else {
      console.log(`✗ FAIL: Got ${result.status}, should be 403 or 404\n`);
    }
  }

  // Test 4: Admin accessing any event
  console.log("Test 4: Admin accessing any event (event 9)");
  const adminCookie = await login("ad1@gmail.com", "password123");
  if (!adminCookie) {
    console.log("❌ Failed to login as admin\n");
  } else {
    const result = await makeRequest("/api/organizer/events/9", adminCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log("✓ PASS: Admin can access any event\n");
    } else {
      console.log(`✗ FAIL: Got ${result.status}\n`);
    }
  }

  // Test 5: Admin accessing analytics for any event
  console.log("Test 5: Admin accessing analytics for any event (event 9)");
  if (adminCookie) {
    const result = await makeRequest("/api/organizer/events/9/analytics", adminCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log("✓ PASS: Admin can access analytics for any event\n");
    } else {
      console.log(`✗ FAIL: Got ${result.status}\n`);
    }
  }

  // Test 6: Admin accessing admin analytics endpoint
  console.log("Test 6: Admin accessing admin analytics endpoint (event 9)");
  if (adminCookie) {
    const result = await makeRequest("/api/admin/analytics?eventId=9", adminCookie);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log("✓ PASS: Admin can access admin analytics endpoint\n");
    } else {
      console.log(`✗ FAIL: Got ${result.status}, response: ${result.data.substring(0, 100)}\n`);
    }
  }

  console.log("\n=== TEST SUMMARY ===");
  console.log("All key routes tested. Check results above.");
  process.exit(0);
}

runTests();
