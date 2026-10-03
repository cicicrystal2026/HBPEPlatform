import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSettlement } from '../public/settlement.js';

test('settlement sum agrees with rounded redemption ledger amounts', () => {
  const result = calculateSettlement([
    {amount:200.17,share:6.01},
    {amount:200.17,share:6.01},
    {amount:258,share:7.74},
  ]);
  assert.deepEqual(result, {
    consumption:315658.34,
    merchantShare:9469.76,
    income:59154.76,
  });
  assert.deepEqual(calculateSettlement([]), {
    consumption:315000,
    merchantShare:9450,
    income:59135,
  });
});
