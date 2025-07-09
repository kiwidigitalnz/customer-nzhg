-- Clear old tokens since new client credentials have been configured
DELETE FROM podio_auth_tokens;

-- Add a comment about the token refresh
COMMENT ON TABLE podio_auth_tokens IS 'Stores Podio OAuth tokens. Tokens are automatically cleared when client credentials change.';