# Initial Configuration Plan

This configuration is designed for a customer-facing API relay at `https://ai.pect-dapp.io`.

## Operating Defaults

- Keep the public entry point as `https://ai.pect-dapp.io`.
- Customers receive New API tokens only; they do not receive upstream Spark keys.
- Registration is enabled, but new users receive no free quota.
- USDT is the preferred recharge method. It stays disabled until `USDT_ADDRESS` is provided.
- Public OAuth providers and email verification stay disabled until real credentials and SMTP are configured.
- Groups start with `default`, `spark`, and `private`.

## Apply Through Admin API

Log in as root in the browser, copy the request Cookie value, then run:

```bash
cd /Users/luhao/Documents/Codex/2026-07-08/r/new-api
NEW_API_ADMIN_COOKIE='session=...' \
USDT_ADDRESS='your-trc20-address' \
./deploy/apply-initial-options.sh
```

If `USDT_ADDRESS` is omitted, USDT remains disabled and no empty address is written.

## Manual Follow-Up

1. Add a DGX Spark channel from the channel page with the preset.
2. Replace `http://spark.local:8000` with the private Spark address reachable by the New API host.
3. Enter a Spark API key dedicated to New API.
4. Test `qwen3.6:35b`.
5. Create customer tokens with the right group and model limits.

## Recommended Customer-Facing Values

- OpenAI-compatible Base URL: `https://ai.pect-dapp.io/v1`
- Raw server address: `https://ai.pect-dapp.io`
- Customers should never call Spark directly.
