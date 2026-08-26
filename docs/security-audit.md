# Security audit — mesh-quick-draw-duel

Generated: **2026-08-26T00:37:12.335Z** · 16 checks · 16 pass · 0 fail

> A programmatic, CPU-only verification of every claim in the four-layer security stack.
> Re-run with `npm run audit:security` from this repo. Source: `mesh-common/tests/securityAudit.test.ts`
> This app does not render the moderator badge yet — only the shared crypto invariants are exercised. The layer-1 guarantees still apply by virtue of bundling `mesh-common`.

## Result

✅ **All checks pass.**

- crypto / Y.Doc invariants: **16 / 16**
- UI-flow checks: **0**  _(this app does not yet expose the moderator UI; pass 2 skipped)_

## Checks

| ID | Claim | Method | Result |
|---|---|---|:---:|
| `L1.IDENTITY.persists` | Identity key persists across reloads via localStorage | loadOrCreateIdentity called twice with same prefix; both keypairs match | ✅ |
| `L1.IDENTITY.uniquePerApp` | Each storagePrefix produces a distinct keypair (no cross-app reuse) | loadOrCreateIdentity with two different prefixes; private keys differ | ✅ |
| `L1.MODERATOR.claimSyncs` | A claims moderator → B's hook reports A as current moderator | linkMockRooms relays Y.Doc updates; A.claim() then read on B | ✅ |
| `L1.MODERATOR.expiredClaimIgnored` | A signed claim with expiresAt in the past is treated as vacant | Plant claim with expiresAt = now - 60s; hook reports current=null | ✅ |
| `L1.MODERATOR.forgedClaimRejected` | A claim with a signature not matching its embedded pubkey is treated as vacant | Plant {pubkey:real, sig:forger}; hook rejects and reports current=null | ✅ |
| `L1.MODERATOR.releaseSyncs` | Relinquish by the current moderator clears the slot for all peers | After A.relinquish() both A and B observe current=null | ✅ |
| `L1.MODERATOR.signedClaim` | The moderator claim's signature verifies against the embedded pubkey | verify({peerId,pubkey,claimedAt,expiresAt,nonce}, sig, pubkey) === true | ✅ |
| `L1.MODERATOR.vacantDefault` | Fresh room reports no moderator and isMe=false | useModerator hook on a fresh mock room returns {current:null, isMe:false} | ✅ |
| `L1.SIGN.rejectGarbage` | Invalid signature / pubkey inputs return false instead of crashing | verify({x:1}, 'not-hex', 'also-bad') and verify({x:1}, '', '') both false | ✅ |
| `L1.SIGN.rejectTampered` | A signed payload with any byte modified fails verification | Sign {msg:'hello'}, then verify({msg:'HELLO'}, …) returns false | ✅ |
| `L1.SIGN.rejectWrongKey` | A's signature does not verify under B's public key | Sign with kpA.priv, verify with kpB.pub returns false | ✅ |
| `L1.SIGN.roundtrip` | A signed payload verifies against the matching pubkey | Ed25519 sign(payload, privkey) then verify(payload, sig, pubkey) | ✅ |
| `L1.TOFU.fingerprint` | trustFingerprint emits a 4x2-hex grouped string for in-person verification | fingerprint(peerId, pubkey) matches /^xx-xx-xx-xx$/ | ✅ |
| `L1.TOFU.peerIdFromPubkey` | peerIdFromPubkey is deterministic and uses 64-bit prefix of pubkey | Two calls with same pubkey return the same 16-hex-char id | ✅ |
| `L1.TOFU.register` | register() writes a self-signed PubkeyRecord into the registry Y.Map | Verify the stored record's signature against its own pubkey | ✅ |
| `L1.TOFU.rejectImposter` | A forged record signed by the wrong key does not block the real peer from publishing | Pre-write mallory-signed alice claim; alice arrives and overwrites with her own | ✅ |

## Evidence

Selected captured evidence (full payloads in `security-audit.json`):

### `L1.IDENTITY.persists`

```json
{
  "pubkeyA": "49c7612399a32b045df2d7a332fd635e2220398a0043e83d33ecdc9f476f73ba",
  "pubkeyB": "49c7612399a32b045df2d7a332fd635e2220398a0043e83d33ecdc9f476f73ba"
}
```

### `L1.IDENTITY.uniquePerApp`

```json
{
  "pubkeyA": "0bf8df52bf0b6046",
  "pubkeyB": "f19a8e6742c3fcf6"
}
```

### `L1.MODERATOR.claimSyncs`

```json
{
  "claimer": "alice",
  "ttlMs": 1800000
}
```

### `L1.MODERATOR.expiredClaimIgnored`

```json
{
  "plantedExpiresAt": 1787704572328,
  "now": 1787704632331
}
```

### `L1.MODERATOR.forgedClaimRejected`

```json
{
  "realPubkey": "da336d7448d28db4",
  "forgerPubkey": "4bffd11a849d287c"
}
```

### `L1.MODERATOR.signedClaim`

```json
{
  "sigLen": 128,
  "nonceLen": 32
}
```

### `L1.SIGN.roundtrip`

```json
{
  "sigLen": 128,
  "pubkeyPrefix": "a5d5d39f7f722861"
}
```

### `L1.TOFU.fingerprint`

```json
{
  "fingerprint": "a9-d5-94-06"
}
```

### `L1.TOFU.peerIdFromPubkey`

```json
{
  "peerId": "cf94f3bc43d2f97a"
}
```

### `L1.TOFU.register`

```json
{
  "peerId": "alice",
  "pubkeyPrefix": "df4f7f1c75dbb380",
  "sigLen": 128
}
```

### `L1.TOFU.rejectImposter`

```json
{
  "forgedPubkey": "74d047c3e72ad1b3",
  "realPubkey": "db73c7f3a2e7ef27"
}
```

---

## How to re-run

```bash
cd mesh-quick-draw-duel
npm run audit:security
```

The audit runs in two passes:

1. **Crypto invariants** (Vitest, ~1s) — sign/verify roundtrips, TOFU registry, moderator role state machine, forged-claim rejection, expired-claim rejection. Uses in-memory Yjs mock rooms; no browser.
2. **UI flow** (Playwright, ~5s) — opens two peer browsers, exercises the visible moderator badge: vacant → claim → sync → release.

Both run **headless, CPU-only**. No GPU acceleration is required; no signaling server is contacted. The fleet's `judge.sh` aggregator includes these checks alongside per-app feature tests.
