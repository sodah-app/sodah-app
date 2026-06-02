async function testAI() {
  try {
    const response = await fetch("http://localhost:3000/api/ai-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        businessId: "BIZ_002",
        message: "Hello, I want to book an appointment."
      })
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testAI();