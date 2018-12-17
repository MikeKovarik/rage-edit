# Changelog


## 2.0.0 (2018-12-??)

### Breaking changes
- `recursive` argument of `.get()` is moved inside of `options`:
  ```js
  // Before:
  Registry.get(path, true)
  // After:
  Registry.get(path, { recursive: true })
  ```
- `type` argument of `.set()` is moved inside of `options`:
  ```js
  // Before:
  Registry.get(path, name, data, 'REG_SZ')
  // After:
  Registry.get(path, name, data, { type: 'REG_SZ' })
  ```
- Now `.set(path)` creates empty key with `undefined` default value instead of empty string (#11):
  ```js
  Registry.set(path)
  Registry.get(path, '')
  // Before:
  ''
  // After:
  undefined
  ```


### Other changes
- **Added** support of single object in addition to arguments in every method (so `.get('HKLM/...')` and `.get({path: 'HKLM/...'})` do the same thing)
- **Added** support of `option`s in the instance mode
- **Added** ability to switch the "registry view" to 64-bit or 32-bit (#11)
- **Added** unicode support
- **Added** experimental BigInt support (???)
- **Changed**: `path` in the instance mode became optional
- **Changed**: New README file
- **Changed**: New tests
- **Fixed** support locales other than English (#10)


## 1.2.0 (2018-10-03)

- **Added** support locales other than English (#4)


## 1.1.0 (2018-09-29)

- **Fixed** AMD bundling


## 1.0.6 (2018-08-31)

- **Added** [code climate](https://codeclimate.com/github/MikeKovarik/rage-edit)


## 1.0.3 - 1.0.5 (2018-03-28)

- **Added** badges to readme
- **Added** changelog
- **Updated** dependencies
- **Fixed** dev dependencies in package.json


## 1.0.1 & 1.0.2 (2018-01-26)

- **Updated** readme


## 1.0.0 (2018-01-26)

- Initial release