# ng: angular reimagined
### full-stack angular with no dependencies

Developers should not have to use different frameworks to build frontend apps and their backend apis. With node.js came full-stack javascript, now comes ng - a lightweight, elegant, full-stack framework.

Warning! ng is pre-alpha, but is being built for production with sponsorship by Pook-n-Cheek. If you have suggestions or are interested in contributing, email adam at adam.kircher@gmail.com

Browse ng on [github](https://github.com/ng-/ng) or install on [npm](https://www.npmjs.org/package/ng)
## Start the server
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

## It's just angular...
ng's api mirrors angular's api as closely as possible.  In fact, the [global api](http://docs.angularjs.org/api/ng/function) is exactly the same: `ng.toJson`, `ng.fromJson`, `ng.isDefined`, etc are all available.  The [module api](http://docs.angularjs.org/api/ng/type/angular.Module) is very similar as well
```javascript
ng.module('example', ['ngRoute'])

.factory('example', function()
{
	return ng.isString('Hi! I am identical on both the server and the client')
})
```

### Node.js:
ng enables full-stack development by allowing you to access node.js within your services.
```javascript
//Require is a node specific function
.factory('os', function()
{
	return require('os')
})
```

utilizing node's require, it is easy to build a modular application using external npm modules
```javascript
.factory('third-party', require('ng.thirdparty').factory)

.directive('third-party', require('ng.thirdparty').directive)
```

here we leverage node's readFileSync to load our templates
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

### Default location:
Config, run, provider, factory, & service are all put on both the client and server. Some services, however, such as controllers, directives, and animations are only available on the client.
```javascript
//Controller's only make sense to be on the client
.controller('example', function($scope, os)
{
	$scope.os = os
})
```

### Specifying location:
Each method includes a client and server property if you wish to register the function in only one place.
```javascript
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

//I am equivalent to the two factories above
.factory('dependent', function($q)
{
	var q = $q.defer()
}
```

### Asymmetry:
Using the client & server properties in tandem, one can create an injectable service that acts differently on the client and on the server, as in this authentication example below.
```javascript
.factory.client('login', function($http)
{
	return function(id, password)
	{
		var promise = $http.get('/rpc/login?verify["'+id+'","'+password+'"]')

		return promise.then(function(access_token)
		{
			//code to store the access token in a session

			return access_token ? true : false
		})
	}
})

.factory.server('login', function(data)
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

### Compatibility:
Almost everything works exactly like angular including dependency injection & decorators.  Things that don't work on the server are - understandably - $location, $document, & $window
```javascript
//This works on both the client and server
.factory('dependent', function($q)
{
	var q = $q.defer()
}

//This works on the client but not the server
.factory('dependent', function($window)
{
	$window.alert("Can I alert on the server?")
}
```

## ... additions to angular
There are two non-angular (ng-only) methods:
- .interceptor() adds middleware
- .transform() pre-processes functions

### Interceptors:
ng - like many node frameworks - uses middleware to process and respond to incoming requests.  ng uses [angular's interceptor api](http://docs.angularjs.org/api/ng/service/$http#interceptors) to build a middleware stack.  Register middleware using the module's interceptor method. You will need at least one interceptor to serve your application
```javascript
.interceptor(function()
{
	return {

		response:function(response)
		{
			//ng.toString() will concatenate all modules, replacing
			//the need to specify each one manually.  To do it the
			//manual way replace ng with the three lines below. Note
			//that modules are automatically enclosed in script tags
			//ng.module('ng'),
			//ng.module('ngRoute'),
			//ng.module('example'),
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
### Transforms:
In the previous os factory and routing config, we showed you a little magic.  How do we make these functions that contain node-specific code run on a browser where node is not available?

*Factories:* Actually the os factory - unlike the other factory examples - will run only on the server. However, ng automatically creates a factory of the same name and identical api on the client.  This "twin" client factory simply calls the server factory via an http request and the result is returned to the client. Since this all happens automatically, the client functionality appears identical to the server's.

```javascript
//This is what the os factory looks like on the client
.factory('os', function($rpc)
{
	//ng's $rpc sends an $http request to the server
	//and will return require('os') asyncronously
	return $rpc('os', '0', 'trigger')
})
```

*Templates:* Something similar happens in the routing config.  The routing config is executed on the server as soon as ng is started.  Once loaded on the server, the templates are written to the client module before it is served by the interceptor. The template will simply appear in the client's config.

Sound complicated?  It's not!  ng uses a very elegant api exposed as the module's transform method.  ng has built in transforms for making client-side factories - like the os example - and filling in templates - like the routing config - but allows you to create your own transforms as well.
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

Transforms are incredibly powerful. This simple transform automatically makes your code minification-safe by surrounding every client function with an angular inline injection array. Now that's power!
```javascript
.transform.client(function(fn, type, name)
{
	//No injection array needed if nothing to inject
	if ( ! fn.length)
	{
		return fn
	}

	//Make an array of args with annotate, then manually append function's string
	return JSON.stringify(ng.injector().annotate(fn)).replace(']', ','+fn+']')
})
```

## changelog
#### 0.0.0-rc4
- Changed Rpc from http.get to post to handle large files
- Changed Rpc to send body as JSON rather than querystring

#### 0.0.0-rc3
- Fixed encoding issue when rpc argument was base64
- Force callback arg to be named 'ng' to ensure interoperability
- Wrapped each module in a closure that renames angular to ng
- Now ng.module(name).toString is enclosed in <script></script>
- Combined $xhr and request into $httpBackend

#### 0.0.0-rc2
- renamed parse -> transform
- renamed stack -> interceptor
- moved transform & interceptor from the global api to module api
- simplified the api for the logger

#### 0.0.0-rc1
- Initial commit

## todos
- Feel free to email adam.kircher@gmail.com with suggestions!
- Should we enable registration to be async?  If so how do we get user to signal that registration is complete? Possibilities include doing ng()(req, res), ng.listen getter fn, or make ng load upon first request
- Transforms currently affect all modules, but should only affect the current module and ones that require it
- Are server's $apply $digest cycles irrelevant? Would it improve performance to override/ignore them?
- Better/Longer Error Stacks that display in both server & client consoles
- More stock middleware, gzip, cache, etc, and more stock transforms (spinoff to new module? ng.stack)
- Enable server.httpBackend to work with streams directly, rather than converting back to them
- In ng.style's type, 'ng' is not interpolated in view; needs 'angular'
- Testing API.  Integrate node's require('assert') into angular? (spinoff to new module? ng.test|assert?).  Would client-only service such as controllers & directives need to be put on server for easy testing?
- Rpc should use "path.to.fn.properties" rather than $rpc[#] in case app want to have rpc api public
- Rpc should allow http.post to be replaced with other protocols (web socket) or methods (put).

## related projects
- [ng.data](https://github.com/ng-/ng.data): simple getter/setter for data persistence
- [ng.seed](https://github.com/ng-/ng.seed): create a modular ng application using npm packages
- ng.cql: realtime cassandra database syncing
- [ng.auth](https://github.com/ng-/ng.auth): example authentication using ng interceptors
- [ng.crud](https://github.com/ng-/ng.crud): example demonstrating a simple crud application using ng.seed
- [ng.style](https://github.com/ng-/ng.style): beautiful html using twitter bootstrap
