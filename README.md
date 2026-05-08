# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

## TURN / NAT traversal

Players connect directly over WebRTC, but STUN only discovers a peer's public
address — it cannot punch through a symmetric NAT or carrier-grade NAT (CGNAT).
A TURN relay gives those peers a fallback: both sides send media to a server
that forwards it.

The **server is the source of truth**. `GET /protocol` returns the ICE servers
the browser must use, built from three environment variables; the client never
hardcodes a relay:

* `TURN_URL` — a `turn:` / `turns:` URI, or a comma-separated list of them.
* `TURN_USERNAME` — long-term credential username.
* `TURN_CREDENTIAL` — long-term credential password.

If `TURN_URL` is unset, clients fall back to STUN only.

Production runs a self-hosted **coturn accessory** (see `config/deploy.yml` and
`config/turnserver.conf`). These host ports must be reachable:

* `3478/udp` — TURN over UDP.
* `3478/tcp` — TURN over TCP (same port number).
* `49152-49247/udp` — relay port range used for the media streams.

For local development the devcontainer starts the same pinned image
(`coturn/coturn:4.17.2-alpine`), mounts `config/turnserver.conf` read-only, and
passes the dev credential `dev:devpass` on the command line, so `/protocol`
advertises `turn:127.0.0.1:3478` locally.

### Verifying the relay

Server side, coturn ships a test client:

```sh
turnutils_uclient -u <user> -w <credential> -p 3478 <host>
```

In a browser, open the WebRTC trickle-ICE sample with the same credentials and
confirm at least one ICE candidate of type **`relay`** appears. Candidates of
type `host` or `srflx` are not proof that TURN works.

### Managed TURN providers

To bypass the self-hosted accessory, point the three env vars at a managed
provider (Metered, Twilio, Cloudflare, …) and ignore the coturn files:

```sh
TURN_URL=turn:relay.example.com:3478
TURN_USERNAME=...
TURN_CREDENTIAL=...
```

### Caveat

Docker Desktop forwards **TCP reliably but not UDP**, so a local UDP relay test
may appear to fail even when the relay is fine. To exercise UDP locally, run the
coturn container with host networking (or a native coturn install); publishing
ports is not enough on Docker Desktop.
