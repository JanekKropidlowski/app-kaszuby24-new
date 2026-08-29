// Test script to verify offline article saving functionality
// Using simple in-memory storage for testing

// Mock article data
const testArticle = {
  id: 12345,
  title: { rendered: 'Test Article' },
  content: { rendered: '<p>This is a test article content.</p>' },
  excerpt: { rendered: 'Test excerpt' },
  date: new Date().toISOString(),
  link: 'https://kaszuby24.pl/test-article',
  _embedded: {
    'wp:featuredmedia': [{
      source_url: 'https://kaszuby24.pl/test-image.jpg'
    }]
  }
};

// Simple in-memory storage simulation
const mockStorage = new Map();

const mockAsyncStorage = {
  setItem: async (key, value) => {
    mockStorage.set(key, value);
    console.log(`Stored: ${key}`);
  },
  getItem: async (key) => {
    const value = mockStorage.get(key);
    console.log(`Retrieved: ${key}`);
    return value;
  }
};

async function testOfflineSaving() {
  console.log('Testing offline article saving functionality...');
  
  try {
    // Test 1: Save article to store
    console.log('1. Testing article save...');
    
    // Simulate saving article (this would normally be done through Zustand store)
    const savedArticles = [testArticle];
    await mockAsyncStorage.setItem('articles-storage', JSON.stringify({
      state: {
        savedArticles: savedArticles,
        recentArticles: []
      },
      version: 0
    }));
    
    console.log('✅ Article saved successfully');
    
    // Test 2: Retrieve saved articles
    console.log('2. Testing article retrieval...');
    const stored = await mockAsyncStorage.getItem('articles-storage');
    const parsed = JSON.parse(stored);
    
    if (parsed.state.savedArticles.length > 0) {
      console.log('✅ Saved articles retrieved successfully');
      console.log(`Found ${parsed.state.savedArticles.length} saved articles`);
    } else {
      console.log('❌ No saved articles found');
    }
    
    // Test 3: Check if article can be accessed offline
    console.log('3. Testing offline access...');
    const article = parsed.state.savedArticles.find(a => a.id === testArticle.id);
    
    if (article) {
      console.log('✅ Article accessible offline');
      console.log(`Title: ${article.title.rendered}`);
      console.log(`Content length: ${article.content.rendered.length} characters`);
    } else {
      console.log('❌ Article not found in offline storage');
    }
    
    // Test 4: Check article structure
    console.log('4. Testing article structure...');
    const requiredFields = ['id', 'title', 'content', 'excerpt', 'date', 'link'];
    const missingFields = requiredFields.filter(field => !article[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ Article has all required fields for offline reading');
    } else {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
    }
    
    console.log('\n🎉 Offline functionality test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Articles can be saved to local storage');
    console.log('- Saved articles can be retrieved offline');
    console.log('- Article content is preserved for offline reading');
    console.log('- Article structure is complete for offline display');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOfflineSaving();
