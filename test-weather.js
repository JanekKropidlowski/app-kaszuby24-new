// Simple test script to check weather services
const { fetchSynopData, fetchHydroData, fetchMeteoData, fetchAllWarnings } = require('./services/weatherService');

async function testWeatherServices() {
  console.log('🌡️ Testing Weather Services...\n');

  try {
    // Test IMGW Synoptic Data
    console.log('📊 Testing Synoptic Data...');
    const synopData = await fetchSynopData();
    console.log(`✅ Synoptic: ${synopData?.length || 0} stations`);
    if (synopData && synopData.length > 0) {
      const gdanskStation = synopData.find(s => s.stacja.toLowerCase().includes('gdańsk'));
      if (gdanskStation) {
        console.log(`   📍 Gdańsk: ${gdanskStation.temperatura}°C, ${gdanskStation.wilgotnosc_wzgledna}% humidity`);
      }
    }
  } catch (error) {
    console.log('❌ Synoptic Data Error:', error.message);
  }

  try {
    // Test IMGW Hydrological Data  
    console.log('\n🌊 Testing Hydrological Data...');
    const hydroData = await fetchHydroData();
    console.log(`✅ Hydrological: ${hydroData?.length || 0} stations`);
    if (hydroData && hydroData.length > 0) {
      const pomorskieStations = hydroData.filter(h => h.wojewodztwo.toLowerCase().includes('pomorskie'));
      console.log(`   📍 Pomorskie: ${pomorskieStations.length} stations`);
    }
  } catch (error) {
    console.log('❌ Hydrological Data Error:', error.message);
  }

  try {
    // Test IMGW Meteorological Data
    console.log('\n🌡️ Testing Meteorological Data...');
    const meteoData = await fetchMeteoData();
    console.log(`✅ Meteorological: ${meteoData?.length || 0} stations`);
  } catch (error) {
    console.log('❌ Meteorological Data Error:', error.message);
  }

  try {
    // Test IMGW Warnings
    console.log('\n⚠️ Testing Weather Warnings...');
    const warnings = await fetchAllWarnings();
    console.log(`✅ Warnings: ${warnings?.length || 0} active`);
    if (warnings && warnings.length > 0) {
      warnings.slice(0, 3).forEach((warning, index) => {
        console.log(`   ${index + 1}. [Level ${warning.level}] ${warning.title}`);
      });
    }
  } catch (error) {
    console.log('❌ Warnings Data Error:', error.message);
  }

  console.log('\n🎯 Weather Services Test Complete!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testWeatherServices();
}

module.exports = { testWeatherServices };
