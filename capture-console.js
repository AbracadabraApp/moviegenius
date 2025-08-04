import puppeteer from 'puppeteer';

async function captureConsoleOutput() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
    consoleMessages.push(`${msg.type()}: ${args.join(' ')}`);
  });
  
  try {
    await page.goto('http://localhost:3000/movie/11', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the testing framework to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('=== EXACT CONSOLE OUTPUT ===');
    consoleMessages.forEach(msg => console.log(msg));
    console.log('=== END CONSOLE OUTPUT ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
}

captureConsoleOutput();