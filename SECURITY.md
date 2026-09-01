# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Use this repository's GitHub **Security** tab to submit a private vulnerability report (GitHub Private Vulnerability Reporting) or create a private security advisory. Include reproduction steps, affected versions or commits, impact, and any proposed mitigation.

If private vulnerability reporting is not enabled for this repository, maintainers must enable it in the repository security settings before publication. Until then, do not disclose sensitive details publicly; ask a maintainer through an established private channel to enable the GitHub reporting route.

We will acknowledge reports, assess severity and scope, and coordinate disclosure through the private advisory. Please allow maintainers reasonable time to investigate and release a fix before public disclosure.

## Supported versions

Security fixes are provided for the latest version on the default branch and the latest published release, if one exists. Older releases are unsupported unless maintainers explicitly state otherwise in their release notes.

## Scope and privacy notes

Reports involving location data, OAuth handling, local SQLite storage, Google Drive backups, native build credentials, dependencies, or CI secrets are in scope. Do not include real travel history, access tokens, credentials, or backups in a report; use redacted examples and private attachments only.

NomadTrack backups are plaintext JSON files in the user's visible Google Drive, not Google AppData, and the app does not provide end-to-end encryption. Local SQLite data and web `localStorage` also do not have application-level encryption. Treat location data and exported backups as sensitive.
