# Changelog

## [2.2.0](https://github.com/node-modules/oss-client/compare/v2.1.0...v2.2.0) (2024-06-25)


### Features

* support cname ([#19](https://github.com/node-modules/oss-client/issues/19)) ([8c64904](https://github.com/node-modules/oss-client/commit/8c649048ca2e87897c09d5da689355cafc1a4d60))

## [2.1.0](https://github.com/node-modules/oss-client/compare/v2.0.1...v2.1.0) (2024-05-08)


### Features

* use utility@2 ([#17](https://github.com/node-modules/oss-client/issues/17)) ([7e677ca](https://github.com/node-modules/oss-client/commit/7e677cae81ea078e6adf70df76d044866f08066f))

## [2.0.1](https://github.com/node-modules/oss-client/compare/v2.0.0...v2.0.1) (2023-10-07)


### Bug Fixes

* add getObjectUrl alias to generateObjectUrl ([#15](https://github.com/node-modules/oss-client/issues/15)) ([0cfa089](https://github.com/node-modules/oss-client/commit/0cfa0899edaaeb1b7da76cfa68bafbdd9d26c863))

## [2.0.0](https://github.com/node-modules/oss-client/compare/v1.2.6...v2.0.0) (2023-10-05)


### ⚠ BREAKING CHANGES

* Drop Node.js < 16 support

Other BREAKING changes:
- remove stsToken support
- remove headerEncoding support
- remove Bucket, Image Client support

https://github.com/eggjs/egg/issues/5257

### Features

* refactor with typescript ([#12](https://github.com/node-modules/oss-client/issues/12)) ([5a0eb01](https://github.com/node-modules/oss-client/commit/5a0eb013e082c66b52eb6b918dd4713c7c54c149))

## [1.2.6](https://github.com/node-modules/oss-client/compare/v1.2.5...v1.2.6) (2023-09-18)


### Bug Fixes

* use stat instead of statSync ([#14](https://github.com/node-modules/oss-client/issues/14)) ([8380b87](https://github.com/node-modules/oss-client/commit/8380b870dfb18a8cc85a437f9cb47cd805402301))

## [1.2.5](https://github.com/node-modules/oss-client/compare/v1.2.4...v1.2.5) (2023-01-08)


### Bug Fixes

* allow Uint8Array to put file ([#10](https://github.com/node-modules/oss-client/issues/10)) ([81af059](https://github.com/node-modules/oss-client/commit/81af059bcce52d54a8fa712ca6ca99a1dcc4aef6))

## [1.2.4](https://github.com/node-modules/oss-client/compare/v1.2.3...v1.2.4) (2022-12-30)


### Bug Fixes

* always return data on completeMultipartUpload ([#9](https://github.com/node-modules/oss-client/issues/9)) ([6c6e7f5](https://github.com/node-modules/oss-client/commit/6c6e7f5828f203eb2d8d1a7a38c79706e3baa3a5))

## [1.2.3](https://github.com/node-modules/oss-client/compare/v1.2.2...v1.2.3) (2022-12-17)


### Bug Fixes

* auto release on action ([#8](https://github.com/node-modules/oss-client/issues/8)) ([e5bfe04](https://github.com/node-modules/oss-client/commit/e5bfe042163951d709c8197c136be7e9e6b9e89b))

---


1.2.2 / 2022-12-09
==================

**fixes**
  * [[`fc2fb8f`](http://github.com/node-modules/oss-client/commit/fc2fb8f9d1b23d355cc8cf12f46d1df6182c6f6f)] - 🐛 FIX: try to use result code first (fengmk2 <<fengmk2@gmail.com>>)

1.2.1 / 2022-12-04
==================

**fixes**
  * [[`cc2cc06`](http://github.com/node-modules/oss-client/commit/cc2cc065ede44d5d40120b4877dfa85e25cd0199)] - 🐛 FIX: object.list type define (#7) (fengmk2 <<fengmk2@gmail.com>>)

1.2.0 / 2022-12-04
==================

**features**
  * [[`a9ad395`](http://github.com/node-modules/oss-client/commit/a9ad39539889f083e0d7671ca19ecc1b263eed74)] - 📦 NEW: Try to use ctx.httpclient first (#6) (fengmk2 <<fengmk2@gmail.com>>)

1.1.1 / 2022-12-04
==================

**fixes**
  * [[`38cebaa`](http://github.com/node-modules/oss-client/commit/38cebaa9f5868d67530cc34ef3cdb4023b9d3a1f)] - 🐛 FIX: Should add oss-interface to dependencies (#5) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`301b0a2`](http://github.com/node-modules/oss-client/commit/301b0a2a3fa9af2ce85e093747f59c8f677dded1)] - 🤖 TEST: Test enable parallel (#4) (fengmk2 <<fengmk2@gmail.com>>)

1.1.0 / 2022-10-27
==================

**features**
  * [[`79b6302`](http://github.com/node-modules/oss-client/commit/79b6302b77bfabfc2750a5c5d48b4059cb04ac78)] - 📦 NEW: Add d.ts and IObjectSimple Client define (#3) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`8d9e935`](http://github.com/node-modules/oss-client/commit/8d9e935ee530ebd9477e6334991465ff59a75b4b)] - 📖 DOC: Remove browser document content (fengmk2 <<fengmk2@gmail.com>>)

1.0.1 / 2022-10-23
==================

**fixes**
  * [[`e7b229f`](http://github.com/node-modules/oss-client/commit/e7b229f839925ff7a8069834b73fe34789e5e00f)] - 🐛 FIX: ClusterClient use class style (fengmk2 <<fengmk2@gmail.com>>)

1.0.0 / 2022-10-23
==================

**features**
  * [[`fe3e2c1`](http://github.com/node-modules/oss-client/commit/fe3e2c1a119ffd3b8a8c77ab6b38ee545c14fb59)] - 👌 IMPROVE: Remove unuse ts files (#2) (fengmk2 <<fengmk2@gmail.com>>),fatal: No names found, cannot describe anything.

**others**
