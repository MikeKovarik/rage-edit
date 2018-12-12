# Table of Contents

* [Options](#options)
  * [`path` – Registry address](#options.path)
  * [`name` – Value name](#options.name)
  * [`data` – Value content](#options.data)
  * [`type` – Value type](#options.type)
  * [`lowercase` – Case in/sensitivity](#options.lowercase)
  * [`format` – Output format](#options.format)
  * [`bits` – Force 64/32bit registry view](#options.bits)
  * [`recursive` – Retrieve content of subkeys](#options.recursive)
  * [`$isOptions` – Explicitly mark object as options object](#options.isOptions)
* [Methods](#methods)
  * [`.get()` – Read data from registry](#method.get)
  * [`.set()` – Write data to registry](#method.set)
  * [`.has()` – Check if key or value exists](#method.has)
  * [`.delete()` – Remove data from registry](#method.delete)
* [Static properties](#static)
  <!-- * [DEFAULT](#static.default)
  * [VALUES](#static.values)
  * [IS_OPTIONS](#static.isOptions) -->
* [Constructor, instance mode](#instance)
  * [new Registry()](#instance.constructor)
  * [Instance properties](#instance.properties)
  * [Examples](#instance.examples)

# <a name="options"></a>Options

## <a name="options.path"></a>`path`
Path is the only value that is required in every method. If first argument is string, it's regarded as `path`

**Example**: `HKLM/SOFTWARE/Overwatch`

* Both backslashes (`\`) and forward slashes (`/`) can be used. Note that backslashes should be always escaped (`\\`).
* Path is case insensitive.
* Path should be started with either long or short hive name:

  |Long name|Short name|
  |-|-|
  |`HKEY_LOCAL_MACHINE`|`HKLM`|
  |`HKEY_CURRENT_USER`|`HKCU`|
  |`HKEY_CLASSES_ROOT`|`HKCR`|
  |`HKEY_USERS`|`HKU`|
  |`HKEY_CURRENT_CONFIG`|`HKCC`|

## <a name="options.name"></a>`name`
Value name, should always be string.

In the [.set()](#method.set) method `name` is regarded as subkey name if `data` is object.

* Set `name` to `''` (empty string) to work with `(Default)` value
* Name is case insensitive (can be changed with `lowercase` option).

## <a name="options.data"></a>`data`
Value data. Can be `String`, `Number`, `Array<String>`, `Buffer`, `Uint8Array`, `ArrayBuffer`

In the [.set()](#method.set) method it also can be `Object`.

## <a name="options.type"></a>`type`
Value type. This option is actual in the [.set() method](#method.set) only. If `type` is omitted, it is inferred from `data` as follows:

|JS type|Registry type|
|-|-|
|`String`|`REG_SZ`, `REG_EXPAND_SZ`|
|`Number`|`REG_DWORD`|
|`Array<String>`|`REG_MULTI_SZ`|
|`Buffer`, `Uint8Array`, `ArrayBuffer`|`REG_BINARY`|

**Note**: if `type` does not start with "REG_", it will be prepended automatically which means `REG_DWORD` and `DWORD` are equal and both are valid types.

## <a name="options.lowercase"></a>`lowercase`
`rage-edit` transforms all key paths and value names (not the actual data of value entry) to lowercase by default to prevent confusion. This does not affect input - you can still use all-caps paths and value names with uppercased characters.

Check the [.get() method](#method.get)'s examples section for output examples.

The lowercasing also can be turned off globally:
```js
Registry.lowercase = false
```

## <a name="options.format"></a>`format`
Retrieving data from the registry poses a complication. Format of the output cannot be as straight forward as JSONs nested structure because the registry better resembles an XML tree where each node can have both a children nodes and also attributes. A Windows registry key can host subkeys as well as value entries, both of which can have the same names leading to possible collisions.

Due to that `rage-edit` offers two types of output formats: `simple` and `complex`. By default `simple` is enabled globally for all calls.

Check the [.get() method](#method.get)'s examples section for detailed output examples.

Format type can be changed globally:
```js
Registry.format = 'complex'
```

### Simple

Simple output tries to resemble JSON at much as possible while trying to avoid collisions with the names of keys and values.

Key names are properties of the object. The key is represented by (stub of) another object. This is useful when calling `Registry.get()` in recursive mode.

Values are stored in `$values` object of `name:data` pairs, where value name is the property, value data is the content of that property, and type is omitted.

So if your key has a subkey named `version` and also a value named `version`, you will be able to access both of them without collision with `output.version` and `output.$values.version`.

**Warning**: `$values` might be still conflicting since `$` is a valid character in key paths. You can change `$values` to be whatever else by changing `Registry.VALUES`. e.g. `Registry.VALUES = '__$$NO_CONFLICT_VALUES'`

The following snippet serves as an example of how output can be nested, but the `HKLM` hive contains enormous amounts of data and thus is not recommended to be queried recursively.

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM/Software', { recursive: true })
software.microsoft.windows.currentversion['Lock Screen'].feedmanager.$values['']
```

### Complex

Offers comprehensive output and first and foremost contains types of value entries since every value entry is represented by `{name, data, type}` object in a `values` array.

Nesting with this format is much more verbose.

```js
// Gets default value (empty string) of HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Lock Screen\FeedManager
var software = await Registry.get('HKLM/Software', { recursive: true, format: 'complex' })
software.keys.microsoft.keys.windows.keys.currentversion.keys['Lock Screen'].keys.feedmanager.values['']
```

## <a name="options.bits"></a>`bits`
64-bit version of Windows uses `Wow6432Node` key to present a separate view of some particular keys (mostly it's the `HKEY_LOCAL_MACHINE/SOFTWARE` key) for 32-bit applications that run on a 64-bit version of Windows. In other words, when a 32-bit application queries a value under the `HKLM/SOFTWARE/Example` subkey, the application reads from the `HKLM/SOFTWARE/Wow6432Node/Example` subkey.

64-bit application can get access to both 64-bit and 32-bit registry views, while 32-bit applications stuck inside of `Wow6432Node` subkeys. The `bits` option can be set to `32` or `64` to force access to 64-bit or 32-bit keys:

|Condition|Requested key|Redirected to|
|-|-|-|
|64-bit node.js **OR** `{ bits: 64 }`|HKLM/SOFTWARE/Example|HKLM/SOFTWARE/Example|
|64-bit node.js **OR** `{ bits: 64 }`|HKLM/SOFTWARE/Wow6432Node/Example|HKLM/SOFTWARE/Wow6432Node/Example|
|32-bit node.js **OR** `{ bits: 32 }`|HKLM/SOFTWARE/Example|HKLM/SOFTWARE/Wow6432Node/Example|
|32-bit node.js **OR** `{ bits: 32 }`|HKLM/SOFTWARE/Wow6432Node/Example|HKLM/SOFTWARE/Wow6432Node/Example|

The format also can be changed globally:
```js
// Force 32-bit mode
Registry.bits = 32

// Force 64-bit mode
Registry.bits = 64

// Let windows decide
Registry.bits = null
```

## <a name="options.recursive"></a>`recursive`
By default, `.get()` calls are not recursive due to performance reasons. This can be changed by setting `recursive` option to `true`.

Check the description of the [.get() method](#method.get) for examples.

## <a name="options.isOptions"></a>`$isOptions`
Allows to explicitly mark object as options object. Is used internally but can also be useful in some edge cases described in the [.set() method](#method.set)'s description.

# <a name="methods"></a>Methods

Every method accepts up to four optional arguments in the following order: `path`, `name`, `data`, `options`. If last argument is object, it's always regarded as options object (`.set()` is an exception, see [$isOptions section](#options.isOptions) above). At least one argument is required. If some of arguments is omitted, it can be specified in options object which means all the following examples do the same thing:

```js
await Registry.get('HKLM/SOFTWARE/Example', 'String')

// Equals to:
await Registry.get('HKLM/SOFTWARE/Example', {
  name: 'String'
})

// Equals to:
await Registry.get({
  path: 'HKLM/SOFTWARE/Example',
  name: 'String'
})
```
```js
await Registry.set('HKLM/SOFTWARE/Example', 'StringVal', 'content', { type: 'REG_SZ' })

// Equals to:
await Registry.set({
  path: 'HKLM/SOFTWARE/Example',
  name: 'StringVal',
  data: 'content',
  type: 'REG_SZ'
})

// Equals to:
// (Warning: this way is not recommended and showed for demonstration purposes only!
//  Please stick with one of the ways described above)
await Registry.set('HKLM/SOFTWARE/Example', {
  $isOptions: true, // Explicitly mark object as options object. Check the '$isOptions' section for details.
  name: 'StringVal',
  data: 'content',
  type: 'REG_SZ'
})

// Equals to:
// (Warning: this way is not recommended and showed for demonstration purposes only!
//  Please stick with one of the ways described above)
await Registry.set('HKLM/SOFTWARE/Example', 'StringVal', {
  $isOptions: true,
  data: 'content',
  type: 'REG_SZ'
})
```

Methods always return [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise):

```js
let str = await Registry.get('HKLM/SOFTWARE/Example', 'String')
console.log(str)

// Equals to:
Registry
  .get('HKLM/SOFTWARE/Example', 'String')
  .then(str => console.log(str))
```

**Note:** the following registry content is used in all example sections:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Example
├── (Default)   REG_SZ      (value not set)
├── StringVal   REG_SZ      content
├── NumberVal   REG_DWORD   0x0000002f(47)
└┬─ Subkey
 ├── (Default)        REG_SZ   Some default value
 └── Another string   REG_SZ   Another value
```

## <a name="method.get"></a>.get([path [, name]][, options])

* Supported options: `path, name, recursive, bits, format, lowercase`

Retrieves content of `path`. Returned object contains subkeys list and values under the `$values` key. To retrive subkeys content, set `recursive` option to `true`.

If `name` is set, the specified name will be returned. In order to work with `(Default)` value, set `name` to `''` (empty string).

`undefined` is returned if either `path` or `name` doesn't exist.

Read value is automatically converted into matching JS type according with a table from [`type` section](#options.type). If you try to read **REG_QWORD** value, it won't be converted due to JS limitations (QWORD value is 64 bit while JS `Number` only supports 53 bit integers). The `reg` command also retrieves values in hex `Ox` notation and `rage-edit` does not change that.

### Examples:
```js
// Getting key structre

-> await Registry.get('HKLM/SOFTWARE/Example')
<- {
    '$values': {
      stringval: 'content',
      numberval: 47 // Name is lowercased because `lowercase` is `true` by default
    },
    subkey: {
      '$values': {} // Empty because `recursive` is `false` by default
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { lowercase: false })
<- {
    '$values': {
      StringVal: 'content',
      NumberVal: 47
    },
    Subkey: {
      '$values': {}
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { recursive: true })
<- {
    '$values': {
      stringval: 'content',
      numberval: 47
    },
    subkey: {
      '$values': {
        '': 'Some default value',
        'another string': 'Another value'
      }
    }
  }

-> await Registry.get('HKLM/SOFTWARE/Example', { format: 'complex' })
<- {
    keys: {
      subkey: {
        keys: {},
        values: []
      }
    },
    values: [
      {
        name: 'stringval',
        type: 'REG_SZ',
        data: 'content'
      },
      {
        name: 'numberval',
        type: 'REG_DWORD',
        data: 47
      }
    ]
  }
```
```js
// Getting value

-> await Registry.get('HKLM/SOFTWARE/Example', 'NumberVal')
<- 47

-> await Registry.get('HKLM/SOFTWARE/Example/Subkey', '')
<- 'Some default value'

-> await Registry.get('HKLM/SOFTWARE/Fake path')
-> await Registry.get('HKLM/SOFTWARE/Example', 'Something that does not exist')
<- undefined
```
```js
// REG_DWORD and REG_QWORD
 
-> Registry.set('HKLM/SOFTWARE/Example', 'DwordValue', 1234, { type: 'REG_DWORD' })
-> Registry.set('HKLM/SOFTWARE/Example', 'QwordValue', 1234, { type: 'REG_QWORD' })

-> Registry.get('HKLM/SOFTWARE/Example', 'DwordValue')
<- 1234

-> Registry.get('HKLM/SOFTWARE/Example', 'QwordValue')
<- '0x4D2'
```

## <a name="method.has"></a>.has([path[, name]][, options])

* Supported options: `path, name, bits`

Just like `.get()` but returns boolean depending on existence of the key or value.

### Examples:
```js
-> await Registry.has('HKLM/SOFTWARE/Example')
-> await Registry.has('HKLM/SOFTWARE/Example', 'NumberVal')
-> await Registry.has('HKLM/SOFTWARE/Example', 'numberval')
<- true

-> await Registry.has('HKLM/SOFTWARE/Fake path')
-> await Registry.has('HKLM/SOFTWARE/Example', 'Something that does not exist')
<- false

// Checks 'HKLM\SOFTWARE\Wow6432Node\Example
-> await Registry.has('HKLM/SOFTWARE/Example', { bits: 32 })
<- false
```

## <a name="method.set"></a>.set(...args)

* Supported options: `path, name, data, type, bits`
* Method overloads:
  * .set(`options`: *Object*)
  * .set(`path`: *String*, `data/options`: *Object*)
  * .set(`path`: *String*, `name`: *String*, `data/options`: *Object*)
  * .set(`path`: *String*, `data`: *Object*, `options`: *Object*)
  * .set(`path`: *String*, `name`: *String*, `data`: *Object*, `options`: *Object*)

Creates or rewrites a `key` or `name`d value inside a key at the given `path`.

If a key at the path doesn't exist it will be created.

If `type` option is ommited, value type is automatically inferred as described in the [type section](#options.type)

Doesn't return anything.

**Note**: In the "Method overloads" section above, **data/options** is regarded as `data` unless the [$isOptions](#options.isOptions) key is set to true (see examples below).

### Examples:
```js
// Create string value (as REG_SZ)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'StringVal', 'content')
// Same as:
await Registry.set({
  path: 'HKEY_LOCAL_MACHINE/SOFTWARE/Example',
  name: 'StringVal',
  data: 'content'
})

// Create dword value (as REG_DWORD)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'NumberVal', 47)

// Explicitly store integer as a string
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'NumberVal', 47, { type: 'REG_SZ' })

// Create default value entry
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example/Subkey', '', 'Some default value')

// Create array (as REG_MULTI_SZ)
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', 'ArrayVal', ['Item 1', 'Item 2', 'Item 3']),

// Create complex structure based on JS object
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/Example', {
  'StringVal': 'content',
  'NumberVal': 47,
  'Subkey': {
    '': 'Some default value',
    'Another string': 'Another value'
  }
})

// The second argument is regarded as subkey name if 'data' is object. Same as above
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE', 'Example', {
  'String': 'text',
  'Number': 47,
  'Subkey': {
    '': 'Some default value',
    'Another string': 'Another value'
  }
})
```
```js
// Edge case: create empty key under the 32bit registry environment.
// Without '$isOptions: true', the object is regarded as data object.
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/New key', { bits: 32, $isOptions: true})

// Edge case: create empty value
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/New key', 'New value', { bits: 32, $isOptions: true})

// Note: there's no conflicts if all arguments or only one object is passed
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/New key', 'New value', 'Content', { bits: 32 })
await Registry.set({
  path: 'HKEY_LOCAL_MACHINE/SOFTWARE/New key',
  name: 'New value',
  data: 'Content',
  bits: 32
})
// No conflicts as well because two objects are specified
await Registry.set('HKEY_LOCAL_MACHINE/SOFTWARE/New key', {
  'New value': 'Content'
}, {
  bits: 32
})
```

## <a name="method.delete"></a>.delete([path[, name]][, options])

Deletes a registry key at the given `path` or deletes a `name`d value entry within this key.

Doesn't return anything.

* Supported options: `path, name, bits`

### Examples:
```js
// Delete value 'NumberVal' in 'HKLM\SOFTWARE\Wow6432Node\Example'
await Registry.delete('HKLM/SOFTWARE/Example', 'NumberVal', { bits: 32 })

// Delete value 'NumberVal' in 'HKLM\SOFTWARE\Example'
await Registry.delete('HKLM/SOFTWARE/Example', 'NumberVal')

// Delete default value in 'HKLM\SOFTWARE\Example'
await Registry.delete('HKLM/SOFTWARE/Example', '')

// Delete key 'HKLM\SOFTWARE\Example' and all of its subkeys and values
await Registry.delete('HKLM/SOFTWARE/Example')
```

# <a name="static"></a>Static properties

## <a name="static.default"></a>`DEFAULT`
* **Description:** String used to represent the name of the default value
* **Default value:** `''`

## <a name="static.values"></a>`VALUES`
* **Description:** String used for naming values key in [simple mode](#options.format)
* **Default value:** `$values`

## <a name="static.isOptions"></a>`IS_OPTIONS`
* **Description:** String used to represent the [$isOptions](#options.isOptions) key
* **Default value:** `$isOptions`

# <a name="instance"></a>Constructor, instance mode

It's possible to create a new `Registry` instance with some defaults overridden with your own.

In the instance mode every method described in the [methods section](#methods) works just like it's expected to work. The only option that behaves different is `path`. See section below for details.

## <a name="instance.constructor"></a>`new Registry([path, ][options])`

### `path`
[Path](#options.path) represents a root path to a key. Can be set through a first argument, or as a `path` option.

If `path` is ommited, every method described in the [methods section](#methods) works just like it's expected to work.

If `path` is set, this option becomes optional in every method. Though if first argument is a string and starts with a slash, it's regarded as a relative path.

### `options`
Object that can contain every option described in the [options section](#options)

## <a name="instance.properties"></a>Instance properties

* **`path`** Full path of current key path.
* **`hive`** Short name of the current hive like `HKCU`
* **`hiveLong`** Long name of the current hive like `HKEY_CURRENT_USER`

**Note**: Those properties are `undefined` is `path` was not specified.

## <a name="instance.examples"></a>Examples
```js
// Work inside of 'HKLM/SOFTWARE/Example' key
let reg = new Registry('HKLM/SOFTWARE/Example')

// Write and read inside of 'HKLM/SOFTWARE/Example'
reg.set('StringVal', 'content')
reg.get('StringVal')

// Write and read inside of 'HKLM/SOFTWARE/Example/Subkey'
reg.set('/Subkey', '', 'Some default value')
reg.get('/Subkey', '')
```
```js
// Change options only
let regStrict = new Registry({ format: 'complex', lowercase: false, recursive: true })

-> await regStrict.get('HKLM/SOFTWARE/Example')
<- {
    keys: {
      Subkey: {
        keys: {},
        values: [
          {
            name: '',
            type: 'REG_SZ',
            data: 'Some default value'
          },
          <...>
        ]
      }
    },
    values: [
      <...>
    ]
  }
```
```js
// Both path and options
let regBinary = new Registry('HKLM/SOFTWARE/Example', { type: 'REG_BINARY' })

reg.set('/Subkey', 'Forced binary value', 'content')
// Same as:
Registry.set('HKLM/SOFTWARE/Example/Subkey', 'Forced binary value', 'content', { type: 'REG_BINARY' })

// Options still can be overridden
reg.set('/Subkey', 'Forced string value', 'content', { type: 'REG_SZ' })
```