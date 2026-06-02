const res = await fetch("https://your-n8n-url/check-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: user.email,
  }),
});

const data = await res.json();

if (data.allowed) {
  // unlock app
} else {
  // redirect to payment page
}