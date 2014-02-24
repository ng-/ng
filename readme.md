# ng (warning! pre-alpha)
### full-stack angular with no dependencies

With node.js came full-stack javascript. However, developers still had to use
different frameworks to build frontend apps and their backend apis. Enter ng,
now there is an elegant, full-stack AngularJS framework with no other dependencies

While still in pre-alpha, ng is being built for production environments with sponsorship
by Pook-n-Cheek.  If you are interested in contributing to the project, email adam at adam.kircher@gmail.com

## example
```javascript
//Enter in the url or file path of module dependencies. ng will load them first
var modules =
{
	ng:'//ajax.googleapis.com/ajax/libs/angularjs/1.2.6/angular.js',
	ngRoute:'node_modules/ng.cdn/1.2.0-route.js'
}

require('ng')(modules, function(ng)
{
	//ng is a listener that accepts a request & reponse
	require('http').createServer(ng).listen(1337)

	ng.module('example', ['ngRoute'])

	//Just like most node.js frameworks ng uses a stack of middleware
	//however its middleware uses Angular's interceptor API. Valid
	//properties include request, requestError, response, responseError
	//The example below sends an app's base template if the response has no data
	.interceptor(function()
	{
		return {

			response:function(data)
			{
				//ng.toString() will concatenate all modules, replacing
				//the need to specify each one manually.  To do it the
				//manual way replace ng with the three lines below:
				//'<script>'+ng.module('ng')+'</script>',
				//'<script>'+ng.module('ngRoute')+'</script>',
				//'<script>'+ng.module('example')+'</script>',
				return data ||
				[
					"<html ng-app='example'>",
						"<head>",
							ng,
						"</head>",
						"<body>",
							"<div class='ng-view'></div>",
						"</body>",
					"</html>"
				]
				.join('\n')
			}
		}
	})

	//Now we are done with ng specifics, the rest of our app looks
	//almost exactly like angular!!!  Look carefully to spot some
	//nodejs specific functions like require/readFile/__dirname etc.
	//Because it has a require, this factory will be placed the server.
	//If you access from the client - e.g., in a controller - then ng
	//will send an http request run the function on the server and
	//return the result, so it will look like it was run on the client
	.factory('$os', function($http, $cpus)
	{
		var os = require('os')

		return [os.cpus, os.cpus]
	})

	//This factory will be put on server and client
	//it will be run from whereever it is accessed
	.factory('me', function(us) { return 'hi' })

	//Easily import 3rd party code such as a db factory/directive
	.factory('db', require('ng.cql').factory)

	.directive('db', require('ng.cql').directive)

	//Controllers are automatically put on the client
	.controller('base', function($scope, $os, $cpus, $http, db)
	{
		$scope.test = db('test').select('*')

		$scope.os = $os[1]()

		$scope.version = ng.version
	})

	//Configs/runs are put on client and server. We make an exception
	//for templates, where the template parser will run the template
	//on the server (readFileSync in this case) and push that result
	//to the client config.  All config/runs are put on client as-is
	.config(function($routeProvider, $locationProvider)
	{
		$routeProvider

		.when('/george', {
			template: require('fs').readFileSync('view/george.html'),
			controller: 'base'
		})

		.when('/adam',
		{
			template:require('fs').readFileSync('view/adam.html'),
			controller: 'base'
		})

		$locationProvider.html5Mode(true);
	})

	//OPTIONAL ADVANCED USAGE

	//Internally ng pre-processes your module code, this functionality
	//is added to the public api as ng.parse(), allowing cool things like
	//automatically creating angularjs's inline injection array,
	//or making your code pretty with automatic indentation.
	//Include these stock parsers by require('./transform')(annotate).inline
	//and/or require('./transform')(annotate).whitespace.

	//Make your own custom parsers using the function signature below
	//For more example's look at the stock parsers in parser.js
	//.transform.client() and .transform.server() provide more granularity
	.transform(function(fn, type, name)
	{
		//Uncomment lines below to see how a custom parser works
		//console.log('I am parsing', type, name)
		//console.log('Function to parse & return', fn.toString())
		//console.log('Module API available as this', this)
		return fn  //I didn't do anything, kept function as-is
	})
})
```
## api
the api is currently not stable, but it is meant to mirror angular's as closely as possible. for the most part ng module api is the same
as angular's http://docs.angularjs.org/api/ng/function/angular.module, with only two new methods:

- .interceptor() for setting interceptor style middleware http://docs.angularjs.org/api/ng/service/$http#interceptors
- .transform() for pre-processing a function before it is put on the server or client, for example, adding inline injection arrays

By default each method registers the exact same function on server or client. To have control over this you can use the client and server
properties available on every method to register the service in only one place.  For example module.factory.server(function() {]}) will only
register that factory on the server. module.factory.client(function() {]}) will only put the code on the client.  Using both client and server
properties in tandom one can create an injectable service that acts differently on the client than on the server.

This is what is done by default for factories that use node.js api like require() since node api is not available on the client. For these factories,
ng - using transforms - will automatically convert the factory's client-side equivalents into remote procedure calls (rpc) to the server.  The result is
their api looking identical on server and client but the internal mechanic of them are quite different. And of course if they were syncronous they will
become async on the client because of the http call to the server

## changes
- renamed parse -> transform & stack -> interceptor and moved them from the global api to module api
- simplified the api for the log function

## todos
- Many, many ideas. Feel free to email me suggestions!
- More stock middleware, gzip etc, and more stock parsers
- Make $location work on server side functions (send header redirect)
- Testing API
- Make namespace use self-executing function rather than setting a global var
- Server/Client Rpc functions should be configurable to replace default http.get to other protocols (web socket) or methods (post).

## related projects
- ng.data: simple getter/setter for data persistence
- ng.seed: create a modular ng application using npm packages
- ng.cql: realtime cassandra database syncing
- ng.auth: example authentication using ng interceptors
- ng.crud: example demonstrating a simple crud application using ng.seed
- ng.style: alert and input helpers for use with twitter bootstrap
