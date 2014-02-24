# ng
### full-stack angular with no dependencies

With node.js came full-stack javascript, now there is full-stack angular. Developers should not have to use
different frameworks to build frontend apps and their backend apis. ng provides a lightweight & elegant, full-stack framework with no other dependencies.

Warning! ng is pre-alpha. While still in pre-alpha, ng is being built for production environments with sponsorship by Pook-n-Cheek. If you have suggestions or are interested in contributing to the project, email adam at adam.kircher@gmail.com

### getting started
Enter in the url or file path of module dependencies. ng will load them first
```javascript
var modules =
{
	ng:'//ajax.googleapis.com/ajax/libs/angularjs/1.2.6/angular.js',
	ngRoute:'node_modules/ng.cdn/1.2.0-route.js'
}

require('ng')(modules, function(ng)
{
	//ng is a listener that accepts a request & reponse
	require('http').createServer(ng).listen(1337)

	//Load your application here
}
```

- ng's api mirrors angular's api as closely as possible.  In fact, the global api is exactly the same: ng.toJson, ng.fromJson, ng.isDefined, etc are all available.  The module api is very similar as well
```javascript
	ng.module('example', ['ngRoute'])

	.factory('example', function()
	{
		return 'Hi! I am an example that is identical on both the server and the client'
	})
```

- With node's require it is easy to build a modular application using 3rd party npm packages
```javascript
	.factory('third-party', require('ng.thirdparty').factory)

	.directive('third-party', require('ng.thirdparty').directive)
```

- Almost everything works exactly like Angular including dependency injection & decorators.  Things that don't work on the server are $location, $document, & $window
```javascript
	//This works
	.factory('dependent', function($q)
	{
		var q = $q.defer()
	}

	//This won't work
	.factory('dependent', function($window)
	{
		$window.alert("Can I alert on the server?")
	}
```

- Some services such as controllers, directives, and animations are only available on the client.  Config, run, provider, factory, & service are all put on both the client and server.
```javascript
	.controller('example', function($scope, os)
	{
		//Controller's only make sense to be on the client
		$scope.os = os
	})
```

- Each method includes a client and server property if you wish to register the function in only one place.
```javascript
	//this factory is the equivalent of the two below
	.factory('dependent', function($q)
	{
		//I will only be available on the server
		var q = $q.defer()
	}

	//I will only be available on the server
	.factory.server('dependent', function($q)
	{
		var q = $q.defer()
	}

	//I will only be available on the client
	.factory.client('dependent', function($q)
	{
		var q = $q.defer()
	}
```

- Using the client & server properties in tandom, one can create an injectable service that acts differently on the client and on the server, this is especially helpful for things like authentication where the server can check on what the client did.
```javascript
.factory.client('login', function($http)
{
	return function(id, password)
	{
		return $http.get('/rpc/login?verify["'+id+'","'+password+'"]').then(function(access_token)
		{
			//code to store the access token in a session

			return access_token ? true : false
		})
	}
})

.factory.client('login', function(data)
{
	var hmac = require('crypto').createHmac

	return
	{
		verify: function(id, password)
		{
			var access_token = hmac('sha256', id).update(password).digest('hex')

			//Save access token to the database

			return access_token
		}
	}
}
```

- ng enables full-stack development by allowing you to access node.js within your services.
```javascript
	.factory('os', function()
	{
		//Look here is a nodejs specific function
		return require('os')
	})
```

- Here we leverage node's api to load our templates (using a transformer which is explained later).
```javascript
	.config(function($routeProvider, $locationProvider)
	{
		$routeProvider

		.when('/', {
			template: require('fs').readFileSync('view/splash.html'),
			controller: 'splashCtrl'
		})

		.when('/example',
		{
			template:require('fs').readFileSync('view/example.html'),
			controller: 'exampleCtrl'
		})

		$locationProvider.html5Mode(true);
	})
```

- ng - like many node frameworks - uses middleware to process and respond to incoming requests.  ng uses angular's interceptor api (http://docs.angularjs.org/api/ng/service/$http#interceptors) to build a middleware stack.  Add middleware with the module's interceptor method.  At the very least you will need to add one middleware interceptor to server your application
```javascript
.interceptor(function()
	{
		return {

			response:function(response)
			{
				//ng.toString() will concatenate all modules, replacing
				//the need to specify each one manually.  To do it the
				//manual way replace ng with the three lines below:
				//'<script>'+ng.module('ng')+'</script>',
				//'<script>'+ng.module('ngRoute')+'</script>',
				//'<script>'+ng.module('example')+'</script>',
				response.data = response.data ||
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

				return response
			}
		}
	})
```

- In the previous os factory and routing config, we showed you a little magic.  How do we make these to functions that have node functions run on a browser where there isn't node.

Actually the os factory - unlike the previous factory examples - will run only on the server. ng automatically creates a factory of the same name and identical api on the client.  This "twin" client factory simply calls the server factory via an http request and the result is returned to the client. Since this all happens automatically, the client functionality appears identical to the server's.

Something similar happens in the routing config.  The config is executed in the server and then the templates are written to the client module when ng first loads.  The template code now appears in the client's config as if it was written there all along.

Sound complicated?  It's not!  ng uses a very elegant api exposed as the module's transform method.  ng has built in transforms for making client-side factories and filling in templates, but allows you to create your own as well.
```javascript
.transform(function(fn, type, name)
{
	//Uncomment lines below to see how a custom transform works
	//console.log('I am transforming', type, name)
	//console.log('Function to transform & return', fn.toString())
	//console.log('Module API available as this', this)
	return fn  //I didn't do anything: kept function as-is
})
```

Don't believe me? Look at this one line transform to see how simple it is to automatically make all of your client code minification-safe by automatically surrounding it with an Angular inline injection array.
```javascript
.transform(function(fn, type, name)
{
	return fn.length ? JSON.stringify(ng.injector().annotate(fn)).replace(']', ','+fn+']') : fn
})
```

### changes
- renamed parse -> transform
- renamed stack -> interceptor
- moved transform & interceptor from the global api to module api
- simplified the api for the logger

### todos
- Many, many ideas. Feel free to email me suggestions!
- More stock middleware, gzip etc, and more stock transforms
- Make $location work on server side functions (send header redirect)
- Testing API.  Any good ideas of how to integrate?
- Make namespace use self-executing function rather than setting a global var
- Rpc functions should allow http.get to be replaced with other protocols (web socket) or methods (post).

### related projects
- ng.data: simple getter/setter for data persistence
- ng.seed: create a modular ng application using npm packages
- ng.cql: realtime cassandra database syncing
- ng.auth: example authentication using ng interceptors
- ng.crud: example demonstrating a simple crud application using ng.seed
- ng.style: alert and input helpers for use with twitter bootstrap
