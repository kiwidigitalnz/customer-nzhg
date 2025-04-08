
# NZ Honey Group Customer Portal

## Overview

This is the customer portal application for NZ Honey Group. It allows customers to log in and view their packing specifications, approve products, and communicate with the team.

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Production Deployment

### Environment Variables

For production deployment, you need to configure the Supabase secrets with your Podio API credentials:

```
PODIO_CLIENT_ID=your_podio_client_id
PODIO_CLIENT_SECRET=your_podio_client_secret
```

These secrets will be used by the Supabase Edge Functions for Podio authentication.

### Build

To build the application for production:

```
npm run build
```

The build output will be in the `dist` directory.

### Deployment

The application is designed to be deployed to the domain `customer.nzhg.com`. Deploy the contents of the `dist` directory to your web server.

### Podio API Configuration

Make sure your Podio API application has the following settings:

1. Domain: `customer.nzhg.com`
2. Redirect URI: `https://customer.nzhg.com/api/podio-oauth-callback`

## Important Notes

- In production, the application will automatically authenticate with Podio using the OAuth flow.
- Users will only need to enter their username and password to log in, with no manual Podio setup required.
- The application is designed to work seamlessly in both development and production environments.
