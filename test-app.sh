#!/bin/bash

echo "🎯 Testing Your Complete Application"
echo "===================================="
echo ""

# Function to test API endpoint and handle JSON parsing
test_endpoint() {
    local description="$1"
    local url="$2"
    local jq_filter="$3"
    
    echo "$description"
    
    # First, test if the endpoint returns valid JSON
    response=$(curl -s "$url")
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to connect to API"
        return 1
    fi
    
    # Check if response is valid JSON
    if echo "$response" | jq empty 2>/dev/null; then
        # If jq filter is provided, use it
        if [ -n "$jq_filter" ]; then
            echo "$response" | jq "$jq_filter"
        else
            echo "$response" | jq '.'
        fi
    else
        echo "❌ Invalid JSON response:"
        echo "$response"
        return 1
    fi
    echo ""
}

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Server is not running on localhost:3000"
    echo "Please start your server with: npm run dev"
    exit 1
fi
echo "✅ Server is running"
echo ""

echo "1️⃣ Testing CARREFOUR search..."
test_endpoint "Search for CARREFOUR" \
    "http://localhost:3000/api/companies/search-v2?q=CARREFOUR" \
    '.results[0] | {denomination, siren, siret, source}'

echo "2️⃣ Testing SIREN search..."
test_endpoint "Search by SIREN" \
    "http://localhost:3000/api/companies/search-v2?q=542107651" \
    '.results[0] | {denomination, siren, source}'

echo "3️⃣ Testing sources count..."
test_endpoint "Check sources" \
    "http://localhost:3000/api/companies/search-v2?q=CARREFOUR" \
    '.sources'

echo "4️⃣ Testing for errors..."
test_endpoint "Check for errors" \
    "http://localhost:3000/api/companies/search-v2?q=CARREFOUR" \
    '.errors'

echo "5️⃣ Testing API health..."
test_endpoint "API Health Check" \
    "http://localhost:3000/api/companies/search-v2?q=TEST" \
    '.success'

echo "✅ Application test complete!"
echo ""
echo "🌐 To test in browser:"
echo "   1. Visit: http://localhost:3000"
echo "   2. Search for: CARREFOUR"
echo "   3. Should see companies from INSEE and BODACC"
echo ""
echo "🔧 If there are errors:"
echo "   1. Check server logs: npm run dev"
echo "   2. Verify environment variables in .env.local"
echo "   3. Test individual APIs: npm run test-apis"
