async function test() {
  try {
    const r = await fetch("http://localhost:5000/api/auth/verify-company", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ pin: "123456" }) 
    });
    console.log('Status:', r.status);
    console.log('Body:', await r.text());
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
test();
