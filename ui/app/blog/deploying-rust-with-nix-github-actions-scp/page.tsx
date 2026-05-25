import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, breadcrumbJsonLd } from "@/components/Breadcrumb";

const SITE_URL = "https://fake-email.site";
const PATH = "/blog/deploying-rust-with-nix-github-actions-scp";
const PUBLISHED = "2026-05-25";
const MODIFIED = "2026-05-25";

export const metadata: Metadata = {
  title:
    "Deploying a Rust service with Nix, GitHub Actions, and SCP — the full guide",
  description:
    "How Fake Email deploys a Rust SMTP + HTTP backend to EC2. Nix flake with Crane for local reproducibility, plain cargo in GitHub Actions for a stock-Ubuntu binary, scp + ssh to ship, systemd to run. Every file, every gotcha.",
  alternates: { canonical: PATH },
  keywords: [
    "deploy rust ec2",
    "rust nix flake",
    "crane nix rust",
    "github actions rust deploy",
    "github actions scp ec2",
    "systemd rust service",
    "deploy rust binary ubuntu",
    "caddy reverse proxy rust",
    "rust smtp server deployment",
  ],
  openGraph: {
    title: "Deploying a Rust service with Nix, GitHub Actions, and SCP",
    description:
      "Nix flake for dev, cargo on Ubuntu for the deploy binary, GitHub Actions to glue it together, scp to ship, systemd to run.",
    url: `${SITE_URL}${PATH}`,
    type: "article",
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
  },
  twitter: {
    card: "summary_large_image",
    title: "Deploying a Rust service with Nix, GitHub Actions, and SCP",
    description:
      "Nix for repro, plain cargo for the deploy binary, scp + systemd to ship.",
  },
};

const BREADCRUMB_JSONLD = breadcrumbJsonLd([
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blog" },
  { name: "Deploying a Rust service with Nix, GitHub Actions, and SCP", href: PATH },
]);

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": `${SITE_URL}${PATH}#article`,
  mainEntityOfPage: `${SITE_URL}${PATH}`,
  headline:
    "Deploying a Rust service with Nix, GitHub Actions, and SCP — the full guide",
  description:
    "How Fake Email deploys a Rust SMTP + HTTP backend to EC2 using a Nix flake for local reproducibility, plain cargo in CI for a stock-Ubuntu binary, and scp + systemd to run it.",
  inLanguage: "en-US",
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  image: `${SITE_URL}/icon.png`,
  author: {
    "@type": "Person",
    name: "Shivraj Soni",
    url: "https://github.com/Shivrajsoni",
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
  keywords: [
    "rust",
    "nix",
    "crane",
    "github actions",
    "ec2",
    "systemd",
    "caddy",
    "deploy",
  ],
};

const HOWTO_JSONLD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Deploy a Rust service from GitHub Actions to EC2 via SCP",
  description:
    "Build a release binary in GitHub Actions, scp it to EC2, atomically swap it into place, restart systemd, and verify health.",
  totalTime: "PT8M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Build the binary in CI",
      text: "Run cargo build --release -p http-server --locked on ubuntu-latest with rust-toolchain stable and Swatinem/rust-cache.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Verify the binary",
      text: "Confirm the ELF file does not reference /nix/store. Nix-linked binaries fail with exec error 203/EXEC on stock Ubuntu.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Ship it",
      text: "Use appleboy/scp-action to copy the binary to /tmp on the EC2 host, then appleboy/ssh-action to swap it into /opt/fake-email/bin atomically.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Restart and verify",
      text: "Stop systemd, install the new binary, start systemd, poll /api/health for up to 30 seconds, fail the deploy if it does not come back.",
    },
  ],
};

export default function DeployBlogPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([BREADCRUMB_JSONLD, ARTICLE_JSONLD, HOWTO_JSONLD]),
        }}
      />
      <main className="mx-auto max-w-3xl px-6 sm:px-12 lg:px-20 py-12 sm:py-16">
        <Breadcrumb
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: "Deploying a Rust service with Nix, GitHub Actions, and SCP" },
          ]}
        />

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-widest text-smoke">
            <time dateTime={PUBLISHED}>{PUBLISHED}</time>
            <span className="text-chalk">·</span>
            <span className="text-vermillion">Engineering</span>
            <span className="text-chalk">·</span>
            <span>18 min read</span>
          </div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]">
            Deploying a Rust service with Nix, GitHub Actions, and SCP
          </h1>
          <p className="mt-5 text-smoke leading-relaxed text-lg">
            Fake Email runs a Rust SMTP + HTTP server on a single EC2 box. The
            deploy pipeline is deliberately boring: <strong>Nix flake</strong>{" "}
            for reproducible local builds, plain <strong>cargo</strong> on
            stock Ubuntu in <strong>GitHub Actions</strong> for the production
            binary, <strong>scp</strong> + <strong>ssh</strong> to ship it,{" "}
            <strong>systemd</strong> to run it, <strong>Caddy</strong> to
            terminate TLS. No Kubernetes, no Docker, no fly.io, no Pulumi.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            This post walks through every file in the deploy path and explains{" "}
            <em>why each piece exists</em> — including the one decision that
            trips up most people the first time: <strong>we use Nix locally
            but do not ship the Nix-built binary.</strong>
          </p>
        </header>

        <nav aria-label="Table of contents" className="mt-10 border border-chalk p-5 bg-parchment">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-widest text-vermillion">
            On this page
          </h2>
          <ol className="mt-3 space-y-1 text-sm text-smoke list-decimal pl-5">
            <li><a className="hover:text-vermillion" href="#shape">The shape of the system</a></li>
            <li><a className="hover:text-vermillion" href="#two-tracks">Two build tracks: Nix for dev, cargo for deploy</a></li>
            <li><a className="hover:text-vermillion" href="#flake">The Nix flake, line by line</a></li>
            <li><a className="hover:text-vermillion" href="#actions">The GitHub Actions workflow</a></li>
            <li><a className="hover:text-vermillion" href="#scp">SCP + SSH: the actual ship</a></li>
            <li><a className="hover:text-vermillion" href="#systemd">systemd unit and hardening</a></li>
            <li><a className="hover:text-vermillion" href="#setup">setup.sh: bootstrap an EC2 host</a></li>
            <li><a className="hover:text-vermillion" href="#caddy">Caddy, DNS, and port 25</a></li>
            <li><a className="hover:text-vermillion" href="#health">Health check loop and rollback</a></li>
            <li><a className="hover:text-vermillion" href="#secrets">Secrets and ssh keys</a></li>
            <li><a className="hover:text-vermillion" href="#pitfalls">Pitfalls we already hit</a></li>
            <li><a className="hover:text-vermillion" href="#run">Run it yourself</a></li>
          </ol>
        </nav>

        <section id="shape" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            1. The shape of the system
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Three components live on a single Ubuntu 22.04 EC2 instance:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li><code>fake-email</code> — our Rust binary, listens on <code>127.0.0.1:3001</code> (HTTP) and <code>0.0.0.0:25</code> (SMTP).</li>
            <li><code>caddy</code> — terminates TLS on <code>:443</code>, reverse-proxies to <code>:3001</code>.</li>
            <li><code>postgres</code> — on a separate managed instance, reached over the network.</li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            Inbound mail arrives on port 25 directly to the Rust SMTP server.
            The browser talks to <code>https://api.fake-email.site</code> →
            Caddy → <code>127.0.0.1:3001</code>. The Next.js UI is on Vercel,
            so the EC2 box never serves HTML. That separation is the entire
            architecture.
          </p>
          <pre className="mt-6 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`                      Internet
          ┌───────────────┼───────────────┐
          │               │               │
     :443 HTTPS       :25 SMTP        :80 ACME
          │               │               │
          └─────────►   Caddy   ◄─────────┘
                          │
                          ▼
                   127.0.0.1:3001    ◄──── fake-email (Rust)
                          │
                          ▼
                    Postgres (managed)`}
          </pre>
        </section>

        <section id="two-tracks" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            2. Two build tracks: Nix for dev, cargo for deploy
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            This is the one thing that confuses every new contributor, so it
            goes first.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            The repo ships a <strong>Nix flake</strong> (<code>flake.nix</code>)
            that uses <a className="text-vermillion underline underline-offset-4" href="https://github.com/ipetkov/crane" target="_blank" rel="noopener noreferrer">Crane</a>{" "}
            to build the Rust workspace reproducibly. On any machine that has
            Nix installed:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono">
{`nix build .#http-server   # produces ./result/bin/http-server
nix run .#backend         # builds and runs with env validation
nix develop               # drops into a shell with cargo, sqlx-cli, node22`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            That binary is perfect for local development and for anyone who
            also runs Nix. The catch:
          </p>
          <div className="mt-5 border-l-4 border-vermillion bg-parchment p-5">
            <p className="text-ink font-medium">
              A Nix-built binary has its interpreter and shared library paths
              hard-coded to <code>/nix/store/&lt;hash&gt;/...</code>. On a
              stock Ubuntu host with no Nix, that interpreter does not exist,
              so the kernel returns <code>ENOENT</code> when systemd tries to
              exec the binary. systemd reports it as{" "}
              <code>status=203/EXEC</code> and the service never starts.
            </p>
          </div>
          <p className="mt-5 text-smoke leading-relaxed">
            Two ways out:
          </p>
          <ol className="mt-3 space-y-2 text-smoke list-decimal pl-5">
            <li>Install Nix on the EC2 host and copy the Nix store closure too — adds a moving part.</li>
            <li>Build the production binary with plain <code>cargo build --release</code> on an Ubuntu runner, so its dynamic loader is <code>/lib64/ld-linux-x86-64.so.2</code> and its <code>libssl</code> is the system <code>libssl3</code>.</li>
          </ol>
          <p className="mt-5 text-smoke leading-relaxed">
            We picked option 2. The GitHub Actions runner is{" "}
            <code>ubuntu-latest</code>, which currently matches the deploy host
            closely enough that the binary just works. <strong>We treat the
            Nix flake as a developer convenience and the cargo build as the
            release artifact.</strong>
          </p>
        </section>

        <section id="flake" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            3. The Nix flake, line by line
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            <code>flake.nix</code> in full:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`{
  description = "fake-email backend (HTTP + SMTP + Postgres)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    crane.url = "github:ipetkov/crane";
  };

  outputs = { self, nixpkgs, flake-utils, crane, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.\${system};
        inherit (pkgs) lib;
        craneLib = crane.mkLib pkgs;

        sqlFilter = path: _type: builtins.match ".*\\\\.sql$" path != null;
        rustSrc = lib.cleanSourceWith {
          src = lib.cleanSource ./.;
          filter = path: type:
            (sqlFilter path type) || (craneLib.filterCargoSources path type);
        };

        commonArgs = {
          src = rustSrc;
          strictDeps = true;
          nativeBuildInputs = with pkgs; [ pkg-config ];
          buildInputs = with pkgs; [ openssl ]
            ++ lib.optionals stdenv.isDarwin [ libiconv ];
          doCheck = false;
        };

        cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
          pname = "fake-email-workspace-deps";
          version = "0.1.0";
          cargoExtraArgs = "--workspace";
        });

        http-server = craneLib.buildPackage (commonArgs // {
          pname = "http-server";
          version = "0.1.0";
          inherit cargoArtifacts;
          cargoExtraArgs = "-p http-server";
        });
        ...
      in { ... });
}`}
          </pre>
          <h3 className="mt-8 font-display font-bold text-ink text-lg">What is doing real work here</h3>
          <ul className="mt-3 space-y-3 text-smoke list-disc pl-5">
            <li>
              <strong>Crane (<code>crane.mkLib</code>)</strong> — a Nix library
              for building Rust workspaces. Splits dependency builds from
              first-party builds so the dep build can be cached aggressively.
            </li>
            <li>
              <strong><code>rustSrc</code> filter</strong> — only include
              files that affect the build. SQL migrations get a custom matcher
              because Crane&apos;s default filter does not see <code>.sql</code>{" "}
              files and the build would otherwise miss <code>migrations/*</code>.
            </li>
            <li>
              <strong><code>cargoArtifacts = buildDepsOnly &#123; ... &#125;</code></strong>{" "}
              — build the workspace dependency graph in one derivation. When a
              first-party source file changes, Nix reuses this derivation;
              when <code>Cargo.lock</code> changes, it rebuilds.
            </li>
            <li>
              <strong><code>http-server = buildPackage &#123; inherit cargoArtifacts; &#125;</code></strong>{" "}
              — build only <code>-p http-server</code>, importing the cached
              dependency build.
            </li>
            <li>
              <strong><code>strictDeps = true</code></strong> — refuse to let
              build-time and runtime dependencies leak into each other.
              Catches a class of accidental dynamic-linker bugs.
            </li>
            <li>
              <strong><code>doCheck = false</code></strong> — tests run in CI,
              not at build time, so the package output is decoupled from test
              flakiness.
            </li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            The flake also exposes a <code>devShell</code> with{" "}
            <code>cargo</code>, <code>rustc</code>, <code>rustfmt</code>,{" "}
            <code>clippy</code>, <code>sqlx-cli</code>, and{" "}
            <code>nodejs_22</code>. A new contributor on macOS or Linux runs{" "}
            <code>nix develop</code> and has exactly the toolchain CI uses.
          </p>
        </section>

        <section id="actions" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            4. The GitHub Actions workflow
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            <code>.github/workflows/nix-backend.yml</code> has two jobs:{" "}
            <code>build</code> (on every push and PR) and <code>deploy</code>{" "}
            (only on a push to <code>main</code>). UI changes are ignored —
            Vercel handles those.
          </p>
          <h3 className="mt-8 font-display font-bold text-ink text-lg">The build job</h3>
          <pre className="mt-3 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`build:
  runs-on: ubuntu-latest
  timeout-minutes: 45
  steps:
    - uses: actions/checkout@v4
    - run: sudo apt-get update -qq && sudo apt-get install -y -qq pkg-config libssl-dev
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: "."
    - run: cargo build --release -p http-server --locked
    - name: Verify ELF (no Nix interpreter)
      run: |
        set -euo pipefail
        file ./target/release/http-server
        if file ./target/release/http-server | grep -q /nix/store; then exit 1; fi
        ldd ./target/release/http-server | head -20
    - uses: actions/upload-artifact@v4
      with:
        name: http-server
        path: ./target/release/http-server
        retention-days: 7`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Notes worth stealing:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>
              <code>--locked</code> on <code>cargo build</code> ensures the
              build uses the committed <code>Cargo.lock</code>. No silent
              dependency upgrades on the deploy path.
            </li>
            <li>
              <strong><code>Swatinem/rust-cache@v2</code></strong> — caches
              the <code>target/</code> directory and registry, cutting CI from
              ~25 min to ~3 min on warm builds.
            </li>
            <li>
              <strong>The ELF verify step</strong> is the safety belt against
              the Nix mistake. If anyone ever swaps <code>cargo build</code>{" "}
              for <code>nix build</code> and uploads the result, the
              <code>grep /nix/store</code> trips and the deploy fails before
              the binary ever leaves CI.
            </li>
            <li>
              <strong>Artifact upload</strong> hands the binary to the deploy
              job. Keeping build and deploy separate means a hot fix can be
              re-deployed by re-running the deploy job without rebuilding.
            </li>
          </ul>
          <h3 className="mt-8 font-display font-bold text-ink text-lg">The deploy job</h3>
          <pre className="mt-3 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`deploy:
  needs: build
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  runs-on: ubuntu-latest
  timeout-minutes: 15
  concurrency:
    group: deploy-production
    cancel-in-progress: false
  steps:
    - uses: actions/download-artifact@v4
      with: { name: http-server, path: artifact }
    - run: |
        set -euxo pipefail
        SRC="$(find artifact -type f -name http-server | head -1)"
        test -n "$SRC"
        cp "$SRC" ./http-server && chmod +x ./http-server
        file ./http-server
    - uses: appleboy/scp-action@v0.1.7
      with:
        host: \${{ secrets.EC2_HOST }}
        username: \${{ secrets.EC2_USER }}
        key: \${{ secrets.EC2_SSH_KEY }}
        source: http-server
        target: /tmp/
    - uses: appleboy/ssh-action@v1
      with:
        host: \${{ secrets.EC2_HOST }}
        username: \${{ secrets.EC2_USER }}
        key: \${{ secrets.EC2_SSH_KEY }}
        script: |
          set -euo pipefail
          ...`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Three things to call out:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>
              <strong><code>concurrency: deploy-production</code> with{" "}
              <code>cancel-in-progress: false</code></strong> — only one deploy
              runs at a time, and new pushes <em>queue</em> rather than
              cancelling the in-flight deploy. This avoids the worst-case where
              a half-shipped binary gets replaced mid-restart.
            </li>
            <li>
              <strong><code>if: github.ref == &apos;refs/heads/main&apos;</code></strong>{" "}
              — PRs build but do not deploy. Manual force-deploys go through
              <em>re-run failed job</em> or a tiny shell command.
            </li>
            <li>
              <strong>Two separate actions for scp and ssh.</strong>{" "}
              <code>appleboy/scp-action</code> ships the file;{" "}
              <code>appleboy/ssh-action</code> runs the install script. A
              single all-in-one action would mix concerns and is harder to
              debug when one half fails.
            </li>
          </ul>
        </section>

        <section id="scp" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            5. SCP + SSH: the actual ship
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            The remote script on EC2 does the careful work:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`set -euo pipefail
test -s /tmp/http-server
if file /tmp/http-server | grep -q '/nix/store'; then
  echo "Refusing to install: Nix-linked binary." >&2
  exit 1
fi
sudo mkdir -p /opt/fake-email/bin
sudo systemctl stop fake-email 2>/dev/null || true
sudo install -m 0755 -o root -g root /tmp/http-server \\
       /opt/fake-email/bin/http-server.new
sudo mv /opt/fake-email/bin/http-server.new \\
       /opt/fake-email/bin/http-server
sudo systemctl daemon-reload || true
sudo systemctl start fake-email
for i in {1..30}; do
  curl -sf --max-time 2 http://127.0.0.1:3001/api/health \\
       | grep -q OK && break || sleep 1
done
sudo systemctl is-active --quiet fake-email
curl -sf --max-time 5 http://127.0.0.1:3001/api/health \\
     | grep -q OK || {
  sudo systemctl status fake-email --no-pager -l || true
  sudo journalctl -u fake-email -n 80 --no-pager || true
  file /opt/fake-email/bin/http-server || true
  sudo ldd /opt/fake-email/bin/http-server || true
  exit 1
}
rm -f /tmp/http-server`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Tactics worth highlighting:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>
              <strong>Belt and suspenders Nix check</strong> on the remote
              host — even if someone bypasses CI and SCPs a binary manually,
              the install step refuses Nix-linked output.
            </li>
            <li>
              <strong>Atomic swap with <code>install</code> + <code>mv</code>.</strong>{" "}
              The new binary lands at <code>http-server.new</code>, then the
              filesystem rename atomically replaces the running path. systemd
              has already been stopped, so there is no race where two
              processes race for port 25.
            </li>
            <li>
              <strong>30-second health-check loop</strong> against{" "}
              <code>/api/health</code>. The deploy fails loudly with{" "}
              <code>journalctl</code> output if the binary will not come up.
              That output lands directly in the GitHub Actions log.
            </li>
            <li>
              <strong>Final cleanup</strong> of <code>/tmp/http-server</code>{" "}
              so the next deploy starts from a clean slate.
            </li>
          </ul>
        </section>

        <section id="systemd" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            6. systemd unit and hardening
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            <code>deploy/fake-email.service</code> is the supervisor. It is
            tiny but hardened:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`[Unit]
Description=fake-email backend (HTTP + SMTP)
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=fake-email
Group=fake-email
WorkingDirectory=/opt/fake-email
EnvironmentFile=/etc/fake-email/env
ExecStart=/opt/fake-email/bin/http-server
Restart=always
RestartSec=2
TimeoutStartSec=30

AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ProtectSystem=true
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictNamespaces=true
LockPersonality=true
RestrictRealtime=true

[Install]
WantedBy=multi-user.target`}
          </pre>
          <h3 className="mt-8 font-display font-bold text-ink text-lg">Why each block matters</h3>
          <ul className="mt-3 space-y-3 text-smoke list-disc pl-5">
            <li>
              <strong><code>AmbientCapabilities=CAP_NET_BIND_SERVICE</code></strong>{" "}
              — required to bind port 25 as the non-root <code>fake-email</code>{" "}
              user. Without this you would have to run the binary as root or
              push the SMTP port to a high number behind an iptables redirect.
            </li>
            <li>
              <strong><code>ProtectSystem=true</code></strong> — read-only{" "}
              <code>/usr</code>, <code>/boot</code>, <code>/efi</code>. We
              deliberately chose <code>true</code> over <code>strict</code>{" "}
              because strict can break the dynamic linker setup on some
              minimal AMIs.
            </li>
            <li>
              <strong><code>ProtectHome=true</code></strong>,{" "}
              <strong><code>PrivateTmp=true</code></strong>,{" "}
              <strong><code>PrivateDevices=true</code></strong> — the service
              cannot see other users&apos; homes, gets its own <code>/tmp</code>{" "}
              namespace, and has no device nodes besides what the kernel needs.
            </li>
            <li>
              <strong><code>NoNewPrivileges=true</code></strong> +{" "}
              <strong><code>RestrictSUIDSGID=true</code></strong> +{" "}
              <strong><code>LockPersonality=true</code></strong> — the process
              cannot escalate, cannot mount, cannot set up unusual personality
              flags.
            </li>
            <li>
              <strong><code>Restart=always</code></strong> with{" "}
              <code>StartLimitBurst=5</code> — recover from transient crashes
              but stop after 5 rapid failures so we are not in a hot loop.
            </li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            The environment file <code>/etc/fake-email/env</code> contains the
            secrets (<code>DATABASE_URL</code>) and runtime config
            (<code>DOMAIN</code>, <code>HTTP_PORT</code>, <code>SMTP_PORT</code>,{" "}
            <code>CORS_ALLOWED_ORIGINS</code>). It is <code>chmod 600</code>{" "}
            and owned by the <code>fake-email</code> user, so only systemd
            (running as root) and the service itself can read it.
          </p>
        </section>

        <section id="setup" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            7. setup.sh: bootstrap an EC2 host
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            <code>deploy/setup.sh</code> turns a fresh Ubuntu 22.04 instance
            into a working host with one command:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono">
{`DATABASE_URL='postgres://user:pass@host/db' \\
VERCEL_ORIGIN='https://your-app.vercel.app' \\
./deploy/setup.sh`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            The script is a series of checks-then-actions:
          </p>
          <ol className="mt-3 space-y-2 text-smoke list-decimal pl-5">
            <li><strong>Preflight</strong> — refuse to run as root, refuse to run on non-Ubuntu, refuse without passwordless sudo. Loud, early.</li>
            <li><strong>Packages</strong> — install <code>curl</code>, <code>jq</code>, <code>netcat</code>, <code>ca-certificates</code>, and crucially <code>libssl3</code> (the dynamic OpenSSL the cargo binary expects).</li>
            <li><strong>DB reachability</strong> — TCP-poke the Postgres host on 5432 so we know networking is correct before continuing.</li>
            <li><strong>Bin dir, user, env file</strong> — create <code>/opt/fake-email/bin</code>, a system <code>fake-email</code> user with <code>nologin</code> shell, and write <code>/etc/fake-email/env</code> with mode 600.</li>
            <li><strong>systemd install</strong> — copy the unit file, daemon-reload, enable.</li>
            <li><strong>Caddy install</strong> — add the Cloudsmith repo, install Caddy, write a one-line Caddyfile (<code>{`api.fake-email.site { reverse_proxy localhost:3001 }`}</code>). Caddy gets its own LetsEncrypt cert on first start.</li>
            <li><strong>Firewall + start</strong> — UFW opens 22, 25, 80, 443; restart fake-email if a binary is already present; restart Caddy.</li>
            <li><strong>Health summary</strong> — poll <code>/api/health</code>, check SMTP banner with <code>nc 127.0.0.1 25</code>, print pass/fail counts.</li>
          </ol>
          <p className="mt-5 text-smoke leading-relaxed">
            One file, no Ansible, no Terraform. For a one-box service this is
            the right scale. If we ever need a second box, this script becomes
            an Ansible playbook within an afternoon.
          </p>
        </section>

        <section id="caddy" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            8. Caddy, DNS, and port 25
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            The DNS picture:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`A     api.fake-email.site   → <EC2 elastic IP>
A     mail.fake-email.site  → <EC2 elastic IP>
MX    fake-email.site       → mail.fake-email.site  (priority 10)`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            <strong>Caddy on :443</strong> auto-provisions a TLS cert for{" "}
            <code>api.fake-email.site</code> via the ACME HTTP-01 challenge
            (Caddy serves the challenge on :80 itself), then reverse-proxies
            HTTP to <code>127.0.0.1:3001</code>. The Caddyfile is two lines.
          </p>
          <p className="mt-4 text-smoke leading-relaxed">
            <strong>Port 25</strong> is the part everybody trips on. Two
            things to know:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li>
              <strong>AWS blocks port 25 outbound</strong> on new accounts.
              You have to{" "}
              <a className="text-vermillion underline underline-offset-4" href="https://aws.amazon.com/premiumsupport/knowledge-center/ec2-port-25-throttle/" target="_blank" rel="noopener noreferrer">file a request</a>{" "}
              with AWS to lift the throttle. (Inbound 25 is fine.)
            </li>
            <li>
              <strong>Reverse DNS (PTR)</strong> on the EC2 elastic IP should
              point to <code>mail.fake-email.site</code> so that careful
              senders accept the connection. AWS sets this via support
              request too.
            </li>
          </ul>
        </section>

        <section id="health" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            9. Health check loop and rollback
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            The CI deploy script polls{" "}
            <code>http://127.0.0.1:3001/api/health</code> for up to 30 seconds
            after starting systemd. The endpoint is a one-liner in the Rust
            binary: it returns <code>{`{"status":"ok"}`}</code> if the DB pool
            is healthy and a 5xx otherwise. Three failure shapes get distinct
            output in the deploy log:
          </p>
          <ol className="mt-3 space-y-2 text-smoke list-decimal pl-5">
            <li>
              <strong>Binary fails to exec</strong> — <code>systemctl status</code>{" "}
              shows <code>203/EXEC</code>, <code>ldd</code> reveals the missing
              library or <code>/nix/store</code> reference.
            </li>
            <li>
              <strong>Binary starts, can&apos;t reach Postgres</strong> —{" "}
              <code>journalctl</code> shows the connection error, the health
              endpoint stays 500.
            </li>
            <li>
              <strong>Binary starts and connects, but bind fails on :25</strong>{" "}
              — usually because we deleted the <code>CAP_NET_BIND_SERVICE</code>{" "}
              capability or the previous process is still holding the socket.
            </li>
          </ol>
          <p className="mt-5 text-smoke leading-relaxed">
            <strong>Rollback</strong> is currently manual: redeploy the
            previous green commit. If we needed faster rollback we would keep
            the previous binary at{" "}
            <code>/opt/fake-email/bin/http-server.prev</code> and add a
            two-line revert script. We have not needed it.
          </p>
        </section>

        <section id="secrets" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            10. Secrets and ssh keys
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Three repo secrets live in GitHub:
          </p>
          <ul className="mt-3 space-y-2 text-smoke list-disc pl-5">
            <li><code>EC2_HOST</code> — the public hostname or IP.</li>
            <li><code>EC2_USER</code> — typically <code>ubuntu</code>.</li>
            <li><code>EC2_SSH_KEY</code> — a deploy-only private key. <strong>Not</strong> your personal key.</li>
          </ul>
          <p className="mt-5 text-smoke leading-relaxed">
            Generate the deploy key locally:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`ssh-keygen -t ed25519 -f deploy_ed25519 -C 'github-actions-deploy'
# add deploy_ed25519.pub to ~/.ssh/authorized_keys on EC2
# copy deploy_ed25519 contents into GitHub secret EC2_SSH_KEY
# (and delete the local files)
shred -u deploy_ed25519 deploy_ed25519.pub`}
          </pre>
          <p className="mt-5 text-smoke leading-relaxed">
            Lock the EC2 sshd to key-only and IPv4-only if possible. Rotate
            the deploy key annually, or immediately if you ever pasted it into
            a tool you don&apos;t trust.
          </p>
        </section>

        <section id="pitfalls" className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            11. Pitfalls we already hit
          </h2>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">Nix binary in production (status=203/EXEC)</h3>
          <p className="mt-2 text-smoke leading-relaxed">
            First deploy. Forgot, ran <code>nix build .#http-server</code>{" "}
            locally and scp&apos;d <code>./result/bin/http-server</code>.
            systemd printed <code>203/EXEC</code> with no other info because
            the kernel could not find <code>/nix/store/&lt;hash&gt;/lib/ld-linux-x86-64.so.2</code>.
            Fix: build with <code>cargo build --release</code> on Ubuntu and
            ship that. The ELF verify step in CI now prevents a repeat.
          </p>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">libssl version skew</h3>
          <p className="mt-2 text-smoke leading-relaxed">
            Built on Ubuntu 22.04 runner (<code>libssl3</code>); the EC2 was
            on Ubuntu 20.04 (<code>libssl1.1</code>). The binary failed with{" "}
            <code>libssl.so.3 not found</code>. Fix: pin the EC2 to 22.04 and
            install <code>libssl3</code> in <code>setup.sh</code> so the
            runtime always matches the runner.
          </p>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">Health probe was too short</h3>
          <p className="mt-2 text-smoke leading-relaxed">
            First version checked once after 1 second. Cold-start of the Rust
            binary + sqlx pool prime can take 3–5 seconds, so the deploy
            falsely failed on the first push of the day. Fix: 30-iteration
            loop with 1s sleeps.
          </p>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">Concurrent deploys clobbering each other</h3>
          <p className="mt-2 text-smoke leading-relaxed">
            Two quick pushes in a row started two deploys; the second
            stopped systemd while the first was still polling. Fix:{" "}
            <code>concurrency.group: deploy-production</code> with{" "}
            <code>cancel-in-progress: false</code>.
          </p>
          <h3 className="mt-6 font-display font-bold text-ink text-lg">AWS port 25 throttle</h3>
          <p className="mt-2 text-smoke leading-relaxed">
            Brand-new AWS accounts cap port 25 outbound. We are
            receive-only, so this did not bite us directly — but if you ever
            want to send (forwarding, bounces), file the request the day you
            spin up the account, not the day you ship.
          </p>
        </section>

        <section id="run" className="mt-14 border-t border-chalk pt-10">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            12. Run it yourself
          </h2>
          <p className="mt-5 text-smoke leading-relaxed">
            Everything described here is in the public repo. To replicate the
            stack on your own EC2 box:
          </p>
          <pre className="mt-5 overflow-x-auto text-xs bg-ink text-page p-5 font-mono leading-relaxed">
{`# on EC2 (Ubuntu 22.04)
git clone https://github.com/Shivrajsoni/fake-email
cd fake-email
DATABASE_URL='postgres://...' \\
VERCEL_ORIGIN='https://your-app.vercel.app' \\
./deploy/setup.sh

# in GitHub repo settings
# add secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY

# locally
git push origin main
# CI builds + deploys; you watch the green check on GitHub`}
          </pre>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://github.com/Shivrajsoni/fake-email"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-6 bg-ink text-page font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-vermillion transition-colors flex items-center"
            >
              View on GitHub →
            </a>
            <Link
              href="/docs/api"
              className="h-12 px-6 border-2 border-ink text-ink font-display font-bold text-sm uppercase tracking-[0.15em] hover:bg-ink hover:text-page transition-colors flex items-center"
            >
              REST API docs
            </Link>
          </div>
        </section>

        <section className="mt-16 border-t border-chalk pt-10">
          <h2 className="font-display text-xl font-bold text-ink">Keep reading</h2>
          <ul className="mt-5 space-y-3 text-smoke">
            <li>
              <Link href="/blog/how-disposable-email-works" className="text-vermillion underline underline-offset-4 hover:text-ink">
                How disposable email works — technical walkthrough
              </Link>
            </li>
            <li>
              <Link href="/disposable-email-address" className="text-vermillion underline underline-offset-4 hover:text-ink">
                What is a disposable email address?
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-vermillion underline underline-offset-4 hover:text-ink">
                REST API reference
              </Link>
            </li>
          </ul>
        </section>

        <footer className="mt-16 border-t border-chalk pt-6 text-xs text-ash">
          <p>
            Written by{" "}
            <a
              href="https://github.com/Shivrajsoni"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermillion underline underline-offset-4"
            >
              Shivraj Soni
            </a>
            , maintainer of{" "}
            <a
              href="https://github.com/Shivrajsoni/fake-email"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermillion underline underline-offset-4"
            >
              the open-source backend
            </a>
            . Published {PUBLISHED}. Last verified {MODIFIED}.
          </p>
        </footer>
      </main>
    </>
  );
}
