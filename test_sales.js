async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rodge1109@yahoo.com', password: 'password123' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login success:', loginData.success);
  console.log('Company ID:', loginData.employee.company_id);
  
  const ordersRes = await fetch('http://localhost:5000/api/orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const ordersData = await ordersRes.json();
  console.log('Orders data length:', ordersData.orders ? ordersData.orders.length : ordersData);
  if(ordersData.orders && ordersData.orders.length > 0) {
    console.log('Sample order company_id:', ordersData.orders[0].company_id);
  }

  const reconRes = await fetch('http://localhost:5000/api/orders/reconciliation', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const reconData = await reconRes.json();
  console.log('Recon orders:', reconData.reconciliation ? reconData.reconciliation.total_orders : reconData);
}

run();
