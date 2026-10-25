import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TransactionRetryKeys } from '../src/lib/transactionRetry.ts';

test('lost responses and manual retries keep a key; success permits an identical new trade', () => {
  const keys = new TransactionRetryKeys();
  const signature = keys.signature('portfolio', { ticker: 'AAPL', price: '10' });
  const key = keys.get(signature);
  assert.equal(keys.get(signature), key);
  assert.equal(keys.get(keys.signature('portfolio', { price: '10', ticker: 'AAPL', name: undefined })), key);
  assert.notEqual(keys.get(keys.signature('other', { ticker: 'AAPL', price: '10' })), key);
  assert.notEqual(keys.get(keys.signature('portfolio', { ticker: 'AAPL', price: '11' })), key);
  // Returning to the original payload after editing retains the unresolved attempt.
  assert.equal(keys.get(signature), key);
  keys.complete(signature, key);
  const next = keys.get(signature);
  assert.notEqual(next, key);
  // A late duplicate response cannot clear a newer attempt's key.
  keys.complete(signature, key);
  assert.equal(keys.get(signature), next);
});
