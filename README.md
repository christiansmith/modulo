# Modulo

Modulo helps you compose large maintainable Express applications from smaller, discreet, reusable apps. It does this primarily by encouraging the use of organizational conventions. However, to help glue everything together, Modulo provides a function to "require" apps and alters the way Express and Jade look up views so your apps can be more self-contained. It also lets you override views packaged in specific apps in your projects views directory.


## Installation

Via npm:

    $ npm install modulo

For development:

    $ git clone https://github.com/christiansmith/modulo.git

## Projects

A Modulo project directory structure looks like this:


    project/
    ├── apps
    │   └── index.js
    │   ├── app1
    │   ├── app2
    │   ├── ...
    ├── config
    │   ├── environments
    │   │   ├── development.js
    │   │   ├── production.js
    │   │   └── test.js
    │   └── index.coffee
    ├── package.json
    └── server.js

The simplest server.js file looks like this:

    var modulo = require('modulo')
      , app = modulo();

    app.load('config');         // requires config/index.js
    app.load('apps');           // requires apps/index.js 

    app.listen(3000);

The Express configuration lives in config/index.(js|coffee) and looks like this:

    module.exports = function (app) {
      app.configure(function () {
        app.set('view engine', 'jade');
        // ...
      });
    };


## Apps

Modular apps live in the project "apps" directory, or they can be published via npm and installed into `node_modules`, just like any other dependency. The simplest app looks like this:


    app/
    ├── index.js
    ├── package.json
    └── views

Each app's index file exports a function that takes an app as an argument and builds on itjust like you would any other Express app. Here's an example:

    module.exports = function (app) {
      app.get('/whatever', function (req, res) {
        // ...
      });
    };


## Loading Apps

Modulo's load method takes an app name and tries requiring the app first from the apps directory, and then from node_modules, where it assumes the app directory is prefixed with "modulo-". After requiring, load registers the app's views in a lookup object. 

`app.load()` has some special cases. `app.load('config')` requires config/index.js and `app.load('apps')` requires apps/index.js.

The apps/index.js file is used for project specific code that can be shared between apps, like error handling, defining locals, etc.


## Referencing Views

Referencing views in our app code differs from a normal Express app in that we pass a namespaced view name instead of a (relative) file path. Given a project with a "blog" app, a reference to the index.jade template would look like this:

    app.get('/blog', function (req, res) {
      req.render('blog/index');
    });

## Overriding Views

If we're reusing an app, we don't want to make changes to the app code itself as this breaks modularity. To change the content of the views, we can simply override them by providing a template in the project/views directory, namespaced according to the app name. For example, to override project/apps/blog/views/show.jade, we simply create a template in project/views/blog/ called show.jade. Now any reference to 'blog/show' will use our override.


## Testing


## Roadmap

At the moment, Modulo only deals with server side modularity. However, the goal is to arrive at a workable solution for incorporating client side code into projects via apps as well.

## Status

This approach is experimental and Modulo is in development. You probably don't want to use it in production (yet).

Other goals a include CLI tools to:

* generate project and app directories
* merge app dependencies into the project's package.json file.
* extract apps from projects into external dependencies
* generate view overrides


## Changelog

Modulo is pre-alpha. There is nothing yet to report.

## Credit

TJ/visionmedia for Express.
Peepcode for the Node.js screencasts and the discussion of mini-apps.
Django and Drupal for inspiration.

## License

(The MIT License)

Copyright (c) 2012 Christian Smith

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
