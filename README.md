React Styleguide Generator
==========================

Easily generate a good-looking styleguide by adding some documentation to your React project.

![preview](https://cloud.githubusercontent.com/assets/869065/8392279/7f3811ae-1d20-11e5-9707-864d5994ba49.png)  
[Demo](http://pocotan001.github.io/react-styleguide-generator/) using the [React-Bootstrap](http://react-bootstrap.github.io/).

## Installation

``` sh
npm install react-styleguide-generator
```

Which requires **React 0.13.0** or newer. To install it `npm install react`.

## Quick Start

### Documenting your React components

Create file for the styleguide, and then add some documentation to a static field named `styleguide`. You can use the [ES6 syntax](https://github.com/lukehoban/es6features) by [Babel](https://babeljs.io/).

``` js
import React from 'react'
import Button from './Button'

export default class extends React.Component {
  static styleguide = {
    index: '1.1',
    category: 'Elements',
    title: 'Button',
    description: 'You can use **Markdown** within this `description` field.',
    code: `<Button size='small|large' onClick={Function}>Cool Button</Button>`,
    className: 'apply the css class'
  }

  onClick () {
    alert('Alo!')
  }

  render () {
    return (
      <Button size='large' onClick={this.onClick}>Cool Button</Button>
    )
  }
}
```

- `index`: Reference to the element's position in the styleguide (optional)
- `category`: Components category name
- `title`: Components title
- `description`: Components description (optional)
- `code`: Code example (optional). Not specifying this will not auto-generate an example.
- `className`: CSS class name (optional)

#### Additional examples in tabs (optional) [Demo](http://pocotan001.github.io/react-styleguide-generator/#!/Features!/Additional%20examples%20in%20tabs)

You can optionally use tabs to segment out examples for a component:

``` js
import React from 'react'
import Button from './Button'

export default class extends React.Component {
  static styleguide = {
    …
    // Component to use for generating additional examples
    exampleComponent: Button,
    // Array of additional example tabs
    examples: [{
      tabTitle: 'Default',
      props: {
        children: 'Default'
      }
    }, {
      tabTitle: 'Primary',
      props: {
        kind: 'primary',
        children: 'Primary',
        onClick () {
          alert('o hay!')
        }
      }
    }]
  }
}
```

- `exampleComponent`: `ReactElement` to use to generate the examples.
- `examples`: Array of examples, which generates additional tabs of example components and sample code
- `examples[].tabTitle`: Title of example tab
- `examples[].props`: Properties to assign to the rendered example component
- `examples[].props.children`: (optional) Child elements to assign to the example component
- `examples[].code`: (optional) Code example. Omitting this will attempt to auto-generate a code example using the `examples[].props`

#### Additional examples via doc comment (optional) [Demo](http://pocotan001.github.io/react-styleguide-generator/#!/Features!/Additional%20examples%20via%20doc%20comment)

Doc comment support example is:

``` js
/**
 * Substitute this description for `styleguide.description`.
 */
export default class extends Component {
  // required for prop documentation
  static displayName = 'ExampleButton'

  static styleguide = {
    …
  }

  // Document the props via react-docgen
  static propTypes = {
    /**
     * Block level
     */
    block: React.PropTypes.bool,
    /**
     * Style types
     */
    kind: React.PropTypes.oneOf(['default', 'primary', 'success', 'info'])
  }

  render () {
    return <Button block kind='primary'>Cool Button</Button>
  }
}
```

If necessary, visit [react-styleguide-generator/example](https://github.com/pocotan001/react-styleguide-generator/tree/master/example) to see more complete examples for the documenting syntax.

### Generating the documentation

#### Command line tool

A common usage example is below.

``` sh
# The default output to `styleguide` directory
rsg 'example/**/*.js'
```

Type `rsg -h` or `rsg --help` to get all the available options.

```
Usage: rsg [input] [options]

Options:
  -o, --output                     Output directory                          ['styleguide']
  -t, --title                      Used as a page title                      ['Style Guide']
  -r, --root                       Set the root path                         ['.']
  -f, --files                      Inject references to files                ['']
  -c, --config                     Use the config file                       ['styleguide.json']
  -p, --pushstate                  Enable HTML5 pushState                    [false]
  -v, --verbose                    Verbose output                            [false]
  -w, --watch                      Watch mode using `browserifyConfig`
  -tid, --typekit-id               Set the id to use with typekit
  -tff, --typekit-font-family      Set the font-family to use in the root

Examples:
  rsg 'example/**/*.js' -t 'Great Style Guide' -f 'a.css, a.js' -v

  # Necessary to use a config file if you want to enable react-docgen
  rsg 'example/**/*.js' -c 'styleguide.json' -v
```

#### Gulp

``` js
var gulp = require('gulp')
var RSG = require('react-styleguide-generator')

gulp.task('styleguide', function (done) {
  var rsg = RSG('example/**/*.js', {
    output: 'path/to/dir',
    files: ['a.css', 'a.js']
  })

  rsg.generate(function (err) {
    if (err) {
      console.error(String(err))
    }

    done()
  })
})
```

#### Grunt

``` js
var RSG = require('react-styleguide-generator')

grunt.registerTask('rsg', 'React style guide', function () {
  var done = this.async()

  try {
    var conf = grunt.config.get('rsg')

    RSG(conf.input, {
      config: conf.configFile,
      watch: false,
      verbose: true
    }).generate(function (err) {
      if (err) {
          grunt.log.error('Error: ' + err + ' ' + err.stack())
          return done(false)
      }

      grunt.log.ok('react styleguide generation complete')
      done()
    })
  } catch (e) {
    grunt.log.error('Error: ' + e + ' ' + e.stack)
    done(false)
  }
})
```

## API

### RSG(input, [options])

Returns a new RSG instance.

#### input

Type: `String`

Refers to [glob syntax](https://github.com/isaacs/node-glob) or it can be a direct file path.

#### options

##### output

Type: `String`  
Default: `'styleguide'`

Output directory path.

##### title

Type: `String`  
Default: `'Style Guide'`

Used as a page title and in the page header.

##### reactDocgen.files

Type: `Array`
Default: `input`

An array of `glob`-able file/paths for `react-docgen` to parse. If not specified, will default the value to `input`.

##### root

Type: `String`  
Default: `'.'`

Set the root path. For example, if the styleguide is hosted at `http://example.com/styleguide` the `options.root` should be `styleguide`.

##### files

Type: `Array`  
Default: `null`

Inject file references into index.html. It uses the file extension to figure out if it's a `scripts` or a `link`. A usage example is:

``` js
{
  files: [
    '//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css',
    'a.css',
    'scripts/a.js'
  ]
}
```

This would generate the following output:

``` html
<!doctype html>
<html>
  <head>
    …
    <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
    <link rel="stylesheet" href="a.css">
  </head>
  <body>
    …
    <script src="scripts/a.js"></script>
  </body>
</html>
```

The files will not be copied into the styleguide folder, only a reference will be injected into the html. It's the http server's responsibility to set the styleguide folder, and all the folders for the other files as a base directory. This can be combined with the `root` option.

##### config

Type: `String|Object`  
Default: `styleguide.json`

The entire range of RSG API options is allowed. [Usage example](https://github.com/subvisual/react-styleguide-generator/blob/master/example/styleguide.json).

An object can be passed instead of a filename that contains the RSG API options.

##### pushstate

Type: `String`  
Default: `false`

Enable HTML5 pushState. When this option is enabled, styleguide will use history API.

##### babelConfig

Type: `Object`  
Default: `null`

Configuration object for babel. Take the following as an example.

``` js
{
  babelConfig: {
    stage: 1
  }
}
```

`stage: 0` is enabled by default. See the [babel docs](http://babeljs.io/docs/usage/options/) for the complete list.

##### typekit

Type: `Object`
Default: `null`

Adds Typekit to the generated styleguide. Allows specifying the typekit id and `font-familly` to use. For instance:

``` js
{
  id: 'rtq7sdx',
  fontFamily: 'proxima-nova'
}
```
##### browserifyConfig

Type: `Object`  
Default: `{ standalone: 'Contents', debug: true }`

A usage example is below. See the [browserify docs](https://github.com/substack/node-browserify#browserifyfiles--opts) for the complete list.

``` js
{
  extensions: ['', '.js', '.jsx']
}
```

##### watch

Type: `String`
Default: `false`

Enables `watchify` for when the `input` files change, speeding up rebuild time.

### rsg.generate([callback])

Generate the files and their dependencies into a styleguide output.

## Demo

Get the demo running locally:

``` sh
git clone git@github.com:pocotan001/react-styleguide-generator.git
cd react-styleguide-generator/example/
npm install
npm start
```

Visit [http://localhost:3000/](http://localhost:3000/) in your browser.

## Troubleshooting

### Error: No suitable component definition found.

Make sure your component contains `displayName` and `render()`.
