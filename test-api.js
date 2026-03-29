import { getDoctorsList } from './src/services/doctorService.js';

async function testApi() {
  console.log('--- Testing GET /doctors ---');
  try {
    const result = await getDoctorsList({});
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApi();
