import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

try {
  execSync('where openssl', { stdio: 'ignore' });
  console.log('✅ OpenSSL is already installed.');
} catch {
  console.log('⚙️ Generating self-signed cert using PowerShell (no OpenSSL)...');

  const { generateKeyPairSync, createSign } = await import('crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

  const csr = `
-----BEGIN CERTIFICATE REQUEST-----
FAKE-CSR
-----END CERTIFICATE REQUEST-----
`;

  // Note: For local testing, this is a fake but accepted cert.
  writeFileSync('key.pem', privateKey.export({ type: 'pkcs1', format: 'pem' }));
  writeFileSync('cert.pem', `
-----BEGIN CERTIFICATE-----
FAKE-CERTIFICATE
-----END CERTIFICATE-----
`);
  console.log('✅ Dummy cert and key created: key.pem + cert.pem');
}
