# INSEE API Setup Guide

## Step 1: Get INSEE API Credentials

1. **Register at INSEE API Portal**
   - Go to: https://api.insee.fr/catalogue/
   - Create an account
   - Subscribe to "Sirene Avis de situation" API

2. **Get OAuth Credentials**
   - Go to your applications
   - Create a new application
   - Note down:
     - Consumer Key
     - Consumer Secret

3. **Add to .env.local**
   ```bash
   # INSEE API Credentials
   INSEE_CONSUMER_KEY="your-actual-consumer-key-here" 
   INSEE_CONSUMER_SECRET="your-actual-consumer-secret-here"
   ```

## Step 2: Test Configuration

After adding credentials, restart your server and test:
- Go to any company page
- Check the "Documents PDF" section
- You should see "INSEE Avis de Situation" available

## API Information

- **Base URL**: https://api-avis-situation-sirene.insee.fr/
- **PDF Endpoint**: /identification/pdf/{formatted_siret}
- **Authentication**: OAuth 2.0 Bearer Token
- **Document Format**: PDF
- **Official Name**: "Avis de situation au répertoire Sirene"