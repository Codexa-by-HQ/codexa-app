# certs

The keys this host generates for itself. Every file here except this README is
ignored by git. Never commit, copy into `.env`, paste into chat or log a key.

| File | What it is | Used by |
|---|---|---|
| `access-token.key` | HS256 secret, 64 random bytes as base64url, on one line | signing and checking every access token |
| `mfa/v<n>.key` | AES-256 key, 32 random bytes as base64url. The highest `n` seals new secrets, every key opens old ones | oauth-mfa, for each person's authenticator secret |
| `oidc-signing.jwk.json` | RSA 2048 private key as a JWK with its `kid` | oauth-oidc, for ID tokens and the published JWKS |

`oauth-mfa` stays off while `mfa/` holds no key, and `oauth-oidc` while its file
is missing. The access token key is required, so the host refuses to start
without it.

Provider secrets that someone else issues, such as Google's client secret,
Cloudinary's API secret or the SMTP password, stay in `.env`, because no script
can create them.

## Commands

Run them from `codexa-app`, with the host stopped. Both refuse to run while
anything listens on the host's port.

```
deno task keys:generate                 create every key that is missing, never replacing one
deno task keys:rotate                   replace the access token and OIDC keys
deno task keys:rotate --only=access     replace only the access token key
deno task keys:rotate --only=oidc       replace only the OIDC key
deno task keys:rotate --only=mfa        add a newer MFA key and re-seal every secret with it
```

Then start the host again.

### What rotating does

- **Access token or OIDC key.** The old file is replaced by a new one, written
  to a temporary file first so it is never half written. Every session in the
  database is ended, so every access token and refresh token stops working and
  everyone signs in again. Apps that verify ID tokens fetch the new public key
  from the JWKS.
- **MFA key.** A new `v<n+1>.key` is written, every stored authenticator secret
  is re-sealed with it one person at a time, and the older key files are
  deleted only once no secret still uses them. Nobody is signed out and nobody
  enrolls their authenticator again. If anything fails, the older keys stay, so
  every secret is still readable, and running the command again finishes.

### Replacing a key by hand

Stop the host, then write the new value in the same format to the same file.
Replacing the access token or OIDC key by hand leaves sessions alive, so run
`deno task keys:rotate --only=access` instead when you want everyone signed out.
Never delete an MFA key by hand: use `--only=mfa`, which re-seals secrets first.

### Pointing at other files

The paths can change in `.env`, relative to `codexa-app`:

```
OAUTH_ACCESS_TOKEN_KEY_FILE=certs/access-token.key
OAUTH_MFA_KEYS_DIR=certs/mfa
OAUTH_OIDC_SIGNING_KEY_FILE=certs/oidc-signing.jwk.json
```
