import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyBlockedAddress, normalizeTargetUrl, assertPublicHost, FetchBlockedError } from '../server/analyze/fetch.mjs'

test('normalizeTargetUrl adds https, strips credentials and hashes, rejects other schemes', () => {
  assert.equal(normalizeTargetUrl('dvoracle.com').toString(), 'https://dvoracle.com/')
  assert.equal(normalizeTargetUrl('http://user:pw@example.com/a#frag').toString(), 'http://example.com/a')
  assert.throws(() => normalizeTargetUrl('ftp://example.com'), FetchBlockedError)
  assert.throws(() => normalizeTargetUrl('file:///etc/passwd'), FetchBlockedError)
  assert.throws(() => normalizeTargetUrl(''), FetchBlockedError)
})

test('private, loopback, link-local and metadata addresses are blocked', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.9.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.ok(classifyBlockedAddress(ip), `${ip} must be blocked`)
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '217.196.61.135', '2606:4700:4700::1111']) {
    assert.equal(classifyBlockedAddress(ip), null, `${ip} must be allowed`)
  }
})

test('assertPublicHost refuses local names and literal private IPs', async () => {
  await assert.rejects(assertPublicHost(new URL('http://localhost:8787/')), FetchBlockedError)
  await assert.rejects(assertPublicHost(new URL('http://169.254.169.254/latest/meta-data')), FetchBlockedError)
  await assert.rejects(assertPublicHost(new URL('http://[::1]/')), FetchBlockedError)
  await assert.rejects(assertPublicHost(new URL('http://printer.local/')), FetchBlockedError)
})
