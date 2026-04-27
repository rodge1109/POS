import axios from 'axios';

async function test() {
  try {
    console.log('Testing bulk import API on port 5000...');
    const res = await axios.post('http://127.0.0.1:5000/api/products/bulk', {
      csv: 'name,category,price\nTest1,Pizza,10.00'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Response:', res.data);
  } catch (e) {
    console.error('API Error Status:', e.response?.status);
    console.error('API Error Data:', e.response?.data || e.message);
  }
}
test();
