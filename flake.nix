{
  description = "fake-email backend (HTTP + SMTP + Postgres)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    crane.url = "github:ipetkov/crane";
  };

  outputs =
    { self, nixpkgs, flake-utils, crane, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        inherit (pkgs) lib;

        craneLib = crane.mkLib pkgs;

        sqlFilter = path: _type: builtins.match ".*\\.sql$" path != null;

        rustSrc = lib.cleanSourceWith {
          src = lib.cleanSource ./.;
          filter = path: type:
            (sqlFilter path type) || (craneLib.filterCargoSources path type);
        };

        commonArgs = {
          src = rustSrc;
          strictDeps = true;
          nativeBuildInputs = with pkgs; [ pkg-config ];
          buildInputs =
            with pkgs;
            [ openssl ] ++ lib.optionals stdenv.isDarwin [ libiconv ];
          doCheck = false;
        };

        cargoArtifacts = craneLib.buildDepsOnly (
          commonArgs
          // {
            pname = "fake-email-workspace-deps";
            version = "0.1.0";
            cargoExtraArgs = "--workspace";
          }
        );

        http-server = craneLib.buildPackage (
          commonArgs
          // {
            pname = "http-server";
            version = "0.1.0";
            inherit cargoArtifacts;
            cargoExtraArgs = "-p http-server";
          }
        );

        run-backend = pkgs.writeShellApplication {
          name = "run-backend";
          runtimeInputs = [ http-server ];
          text = ''
            : "''${DATABASE_URL:?DATABASE_URL must be set}"
            if [ -z "''${MAIL_DOMAIN:-}" ] && [ -z "''${DOMAIN:-}" ]; then
              echo "MAIL_DOMAIN or DOMAIN must be set" >&2
              exit 1
            fi
            exec ${http-server}/bin/http-server
          '';
        };
      in
      {
        checks.http-server = http-server;

        packages = {
          default = http-server;
          inherit http-server run-backend;
          backend = http-server;
        };

        apps = {
          default = flake-utils.lib.mkApp { drv = run-backend; name = "run-backend"; };
          backend = flake-utils.lib.mkApp { drv = run-backend; name = "run-backend"; };
        };

        devShells.default = craneLib.devShell {
          checks = self.checks.${system};
          packages = with pkgs; [ cargo rustc rustfmt clippy sqlx-cli nodejs_22 ];
        };
      }
    );
}
