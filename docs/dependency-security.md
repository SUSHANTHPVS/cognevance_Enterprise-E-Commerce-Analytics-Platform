# Dependency Security

The initial npm advisory scan found 15 Nodemailer advisories affecting the resolved `nodemailer@6.10.1` dependency, including high-severity denial-of-service and credential-interception reports. The affected dependency was upgraded to `nodemailer@10.1.0`; the existing SMTP `createTransport` and `sendMail` adapter passes the API TypeScript check.

Verification after the upgrade:

- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities
- GitHub Security Advisories scan of direct production dependencies: zero findings
- Server TypeScript check: passed

The major-version change is intentional because supported fixes were not available on the old major line. A live SMTP delivery test still requires configured SMTP credentials. Scanner input and before/after reports are retained locally under the ignored `.security-reports/` directory; they are not committed with the source.
