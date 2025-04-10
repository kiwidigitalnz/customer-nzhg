
# NZ Honey Group Customer Portal

## Overview

A customer portal application for NZ Honey Group that allows customers to log in, view packing specifications, approve products, and communicate with the team.

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production

1. Configure Supabase secrets with Podio API credentials:
   ```
   PODIO_CLIENT_ID=your_podio_client_id
   PODIO_CLIENT_SECRET=your_podio_client_secret
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Deploy the contents of the `dist` directory to your web server.

### Podio Configuration

- Domain: `customer.nzhg.com`
- Redirect URI: `https://customer.nzhg.com/api/podio-oauth-callback`

## Notes

- Users only need to enter their username and password to log in
- The application handles Podio authentication automatically
- Designed to work seamlessly in both development and production environments
