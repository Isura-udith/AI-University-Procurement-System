async function test() {
  const url = 'http://localhost:3000/api/v1/credentials';
  const apiKey = '9tM11ngnW-X7MEfszPPINbbEx9ipTPQOJ5rohwv5NHU';
  
  // Test 1: No auth
  try {
    const res = await fetch(url);
    console.log('No Auth Status:', res.status);
  } catch (err) {
    console.log('No Auth Error:', err.message);
  }

  // Test 2: x-api-key header
  try {
    const res = await fetch(url, {
      headers: { 'x-api-key': apiKey }
    });
    console.log('x-api-key Status:', res.status);
    if (res.ok) {
      console.log('x-api-key Data:', await res.json());
    }
  } catch (err) {
    console.log('x-api-key Error:', err.message);
  }

  // Test 3: Authorization Bearer header
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log('Bearer Status:', res.status);
  } catch (err) {
    console.log('Bearer Error:', err.message);
  }
}

test();
