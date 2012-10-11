/*
 * Copyright(c) 2012 Christian Smith <smith@anvil.io>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Module dependencies
 */

var express = require('express')
  , jade = require('jade')
  , path = require('path')
  , fs = require('fs')
  , app = express.application;

/**
 * Modulo can be used as a proxy to Express or as a patch,
 * for example:
 *
 *    // In place of Express
 *    var modulo = require('modulo')
 *      , app = modulo();
 *
 *    // As a patch to Express and Jade
 *    var express = require('express')
 *      , jade = require('jade');
 *
 *    require('modulo')
 *    var app = express();
 *
 * Here we proxy express with this module.
 */

module.exports = exports = function () {
  return express();
};

for (var key in express) {
  exports[key] = express[key];
}

/**
 * The app.views object is a registry of views. The idea is for developers to 
 * declare what they want instead of where it is. 
 *
 * Keys are of the form <namespace>/<viewname> and values are the absolute
 * path to the view, sans extension.
 */

var views = exports.views = {};

/**
 * Make models accessible throughout the project.
 */

exports.models = {}

/**
 * registerViews takes a directory and a namespace and recursively registers 
 * any templates in the views object. This can be called multiple times and 
 * each successive call can overwrite existing pairs.
 */

exports.registerViews = function (dir, ns) {
  var listings = fs.readdirSync(dir)
    , self = this;

  listings.forEach(function (listing) {
      var file = path.join(dir, listing)
        , stat = fs.statSync(file);

      if (stat.isFile()) {
        var view = listing.split('.')[0]
          , key, val;
      
        if (ns) {
          key = ns + '/' + view;
        } else {
          key = view;
        }

        // this breaks when there is a . in the path leading up to the file name
        val = path.resolve(file).split('.')[0]
        self.views[key] = val

      } else if (stat.isDirectory()) {
        var subdir = path.join(dir, listing)
          , subns;
          
        if (ns) {
          subns = ns + '/' + listing;
        } else {
          subns = listing
        }

        self.registerViews(subdir, subns);
      }
  });
};

/**
 * Wrap express.application.render to lookup paths in the views object.
 */

var _render = app.render
exports.render = function (name, options, fn) {
  var _name = this.views[name];
  _render.call(this, _name, options, fn);
};
  
/**
 * app.require composes express applications from modular apps in the apps/
 * or node_modules directories.
 *
 * All modules loaded with app.require must export a function that takes
 * an Express app as an argument.
 *
 * When require is called with "apps" as the name argument, apps/index.js will
 * will be loaded.
 */

exports.load = function (name, ns) {
  var env = process.env.NODE_ENV
    , cwd = process.cwd()
    , context = (fs.existsSync('./test/project')) ? 'test/project' : ''
    , modulePath
    , viewsPath;

  switch (name) {
    case 'config':
      modulePath = path.join(cwd, context, name)
      require(modulePath)(this);
      break;

    case 'apps':
      modulePath = path.join(cwd, name);
      require(modulePath)(this);
      this.registerViews(path.join(cwd, 'views'));
      break;

    case 'self':
      modulePath = cwd;
      require(modulePath)(this);
      this.registerViews(path.join(cwd, 'views'), ns);
      this.registerViews(path.join(cwd, context, 'views'));
      break;

    default:
      try {
        modulePath = path.join(cwd, context, 'apps', name);
        require(modulePath)(this);
      } catch (e) {
        modulePath = path.join(cwd, 'node_modules', 'modulo-' + name);
        require(modulePath)(this);
      }

      viewsPath = path.join(modulePath, 'views');
      ns = ns || name;
      if (fs.existsSync(viewsPath)) {
        this.registerViews(viewsPath, ns);
      }

  }
};

['views', 'registerViews', 'models', 'render', 'load'].forEach(function (key) {
  var desc = Object.getOwnPropertyDescriptor(exports, key);
  Object.defineProperty(app, key, desc);
});

/**
 * Modify Jade's `extends` behavior to lookup paths in our views object
 *
 * First we monkeypatch the lexer to look up the view path from our 
 * views object.
 */

exports['extends'] = function () {
  var captures;
  if (captures = /^extends +([^\n]+)/.exec(this.input)) {
    this.consume(captures[0].length);
    var name = 'extends'
      , val = views[captures[1]];
    return this.tok(name, val);
  }
};

var desc = Object.getOwnPropertyDescriptor(exports, 'extends');
Object.defineProperty(jade.Lexer.prototype, 'extends', desc);

/**
 * Change the way parseExtends constructs the file path for the 
 * extending template. Specifically, we don't need to add the dirname
 * in front of the extending templates filename, because our lookup
 * (during lexing) yields an absolute path.
 */

exports.parseExtends = function () {
  var path = this.expect('extends').val.trim() + '.jade'
    , str = fs.readFileSync(path, 'utf8')
    , parser = new jade.Parser(str, path, this.options);

  parser.blocks = this.blocks;
  parser.contexts = this.contexts;
  this.extending = parser;

  return new jade.nodes.Literal('');
};

var desc = Object.getOwnPropertyDescriptor(exports, 'parseExtends');
Object.defineProperty(jade.Parser.prototype, 'parseExtends', desc);



/**
 * Like `extends`, `include` also needs to lookup the path to the view.
 */

exports['include'] = function () {
  var captures;
  if (captures = /^include +([^\n]+)/.exec(this.input)) {
    this.consume(captures[0].length);
    var name = 'include'
      , val = views[captures[1]];
    return this.tok(name, val);
  }
};

var desc = Object.getOwnPropertyDescriptor(exports, 'include');
Object.defineProperty(jade.Lexer.prototype, 'include', desc);


/**
 * And the parseInclude function will need to be patched as well.
 */


exports.parseInclude = function(){
  var path = require('path')
    , fs = require('fs')
    , dirname = path.dirname
    , basename = path.basename
    , join = path.join;

  var path = this.expect('include').val.trim()
    , dir = dirname(this.filename);

  if (!this.filename)
    throw new Error('the "filename" option is required to use includes');

  // no extension
  if (!~basename(path).indexOf('.')) {
    path += '.jade';
  }

  // non-jade
  if ('.jade' != path.substr(-5)) {
    var path = path //join(dir, path)
      , str = fs.readFileSync(path, 'utf8');
    return new nodes.Literal(str);
  }

  var path = path //join(dir, path)
    , str = fs.readFileSync(path, 'utf8')
   , parser = new jade.Parser(str, path, this.options);
  parser.blocks = this.blocks;
  parser.mixins = this.mixins;

  this.context(parser);
  var ast = parser.parse();
  this.context();
  ast.filename = path;

  if ('indent' == this.peek().type) {
    ast.includeBlock().push(this.block());
  }

  return ast;
};

var desc = Object.getOwnPropertyDescriptor(exports, 'parseInclude');
Object.defineProperty(jade.Parser.prototype, 'parseInclude', desc);
