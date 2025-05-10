import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { isIP } from '../../src/util/index.js';

describe('test/util/isIP.test.ts', () => {
  it('ipv4 test', () => {
    // first length is 3
    assert.equal(isIP('200.255.255.255'), true);
    assert.equal(isIP('223.255.255.255'), true);
    assert.equal(isIP('224.255.255.255'), true);
    assert.equal(isIP('192.0.0.1'), true);
    assert.equal(isIP('127.0.0.1'), true);
    assert.equal(isIP('100.0.0.1'), true);
    assert.equal(isIP('90.0.0.1'), true);
    assert.equal(isIP('9.0.0.1'), true);
    assert.equal(isIP('090.0.0.1'), false);
    assert.equal(isIP('009.0.0.1'), false);
    assert.equal(isIP('200.1.255.255'), true);
    assert.equal(isIP('200.001.255.255'), false);

    // first length is 1 or 2
    assert.equal(isIP('09.255.255.255'), false);
    assert.equal(isIP('9.255.255.255'), true);
    assert.equal(isIP('90.255.255.255'), true);
    assert.equal(isIP('00.255.255.255'), false);
    assert.equal(isIP('-.0.0.1'), false);
    assert.equal(isIP('0.0.0.1'), true);
    assert.equal(isIP('1.0.0.1'), true);

    // test last 3 byte
    assert.equal(isIP('200.0.255.255'), true);
    assert.equal(isIP('200.01.255.255'), false);
    assert.equal(isIP('200.1.255.255'), true);
    assert.equal(isIP('200.10.255.255'), true);
    assert.equal(isIP('200.256.255.255'), false);
    assert.equal(isIP('200.1.255.255'), true);
    assert.equal(isIP('200.001.255.255'), false);

    assert.equal(isIP('200.255.0.255'), true);
    assert.equal(isIP('200.255.01.255'), false);
    assert.equal(isIP('200.255.1.255'), true);
    assert.equal(isIP('200.255.10.255'), true);
    assert.equal(isIP('200.255.256.255'), false);
    assert.equal(isIP('200.255.001.255'), false);
    assert.equal(isIP('200.255.1.255'), true);

    assert.equal(isIP('200.255.255.0'), true);
    assert.equal(isIP('200.255.255.01'), false);
    assert.equal(isIP('200.255.255.1'), true);
    assert.equal(isIP('200.255.255.10'), true);
    assert.equal(isIP('200.255.255.256'), false);
    assert.equal(isIP('200.255.255.001'), false);
    assert.equal(isIP('200.255.255.1'), true);

    // excetion
    assert.equal(isIP('200'), false);
    assert.equal(isIP('200.1'), false);
    assert.equal(isIP('200.1.1'), false);
    assert.equal(isIP('200.1.1.1.1'), false);
  });

  it('ipv6 test', () => {
    assert.equal(isIP('1:2:3:4:5:6:7::'), true);
    assert.equal(isIP('1:2:3:4:5:6:7:8'), true);
    assert.equal(isIP('1:2:3:4:5:6::'), true);
    assert.equal(isIP('1:2:3:4:5:6::8'), true);
    assert.equal(isIP('1:2:3:4:5::'), true);
    assert.equal(isIP('1:2:3:4:5::8'), true);
    assert.equal(isIP('1:2:3:4::'), true);
    assert.equal(isIP('1:2:3:4::8'), true);
    assert.equal(isIP('1:2:3::'), true);
    assert.equal(isIP('1:2:3::8'), true);
    assert.equal(isIP('1:2::'), true);
    assert.equal(isIP('1:2::8'), true);
    assert.equal(isIP('1::'), true);
    assert.equal(isIP('1::8'), true);
    assert.equal(isIP('::'), true);
    assert.equal(isIP('::8'), true);
    assert.equal(isIP('::7:8'), true);
    assert.equal(isIP('::6:7:8'), true);
    assert.equal(isIP('::5:6:7:8'), true);
    assert.equal(isIP('::4:5:6:7:8'), true);
    assert.equal(isIP('::3:4:5:6:7:8'), true);
    assert.equal(isIP('::2:3:4:5:6:7:8'), true);
    assert.equal(isIP('A:0f:0F:FFFF:5:6:7:8'), true);
    assert.equal(isIP('A:0f:0F:FFFF1:5:6:7:8'), false);
    assert.equal(isIP('G:0f:0F:FFFF:5:6:7:8'), false);
  });
});
