'use strict'

// Pook Framework > copyright Adam Kircher > adam.kircher@gmail.com
// ----------------------------------------------------------------


module.exports = function(modules, user)
{
	require('./angular')(modules, function(angular)
	{
		var injector  = angular.injector()
		  , annotate  = injector.annotate
		  , log       = require('./logger')
		  , module    = require('./package')
		  , extend    = require('./extend')
		  , remote    = require('./remote')
		  , intercept = require('./intercept')
		  , transform = require('./transform')(annotate)

		// Extend Angular's global api with helper methods
		// --------------------------------------------------
		function ng(req, res)
		{
			return injector.get('$run')(req, res)		    		//Base object is a listener for nice api
		}

		angular.copy(angular, ng) 									    //Copy all of angular to the new base object

		ng.version.name = annotate(user)[0]			    			//Save user's namespace as it might not be angular

		ng.version.ng   = module.version			   			    //Include our version

		ng.module       = extend(ng.module)                    //Creates client & server apps simultaneously

		ng.toString = function()									    //Concat all scripts into one automatically
		{
			var result = []

			for (var i in angular.module._cache)
			{
				if (modules[i] && ~ modules[i].indexOf('//'))
				{
					result.push("<script src='"+modules[i]+"'></script>")
				}
				else if ('$rpc' != i)
				{
					result.push('<script>'+ng.module(i)+'</script>')
				}
			}

			return result.join('\n')
		}

		// Server's tranforms, stack & client's remote procedure calls
		// --------------------------------------------------

		ng.module('$rpc', [])								 		  //Dependency for all user modules

		.transform.client(transform.rpc) 						  //Client side rpc for server factory fn

		.transform.client(transform.interceptor)			  	  //Allow interceptor-type middleware stack

		.transform.client(transform.template)				     //Allow templates to be defined in ngRoute

		.transform.client(transform.assertClient)			     //Client cannot use require, __dirname, or __filename

		.transform.server(transform.assertServer)			     //Server cannot inject $window, $browser, or $location

		.config.client(remote.$sce)                          //Get rid of unnecessary quotes

		.factory.server('$exceptionHandler', log.handler)    //Log entire error.stack to server

		.factory.server('$run', intercept.$run)   	  	     //Called on incoming connection

		.factory.server('$httpBackend', intercept.$xhr)		  //Replaces XHR with node's http.request

		.factory.server('$rpc', remote.server)			 		  //Remote procedure call response

		.factory.client('$rpc', remote.client) 		 		  //Remote procedure call request

		// Register user and then ng modules with angular
		// --------------------------------------------------
		user(ng)													 		  //Load user generated modules

		var requires = Object.keys(angular.module._cache)	  //Array of all required modules
		  , length   = Object.keys(modules).length + 1

		if ( ! requires[length])
		{
			return log.red(Error('No user modules were registered! Registration cannot by asyncronous'))
		}

		var module   = ng.module(requires[length])
		  , toString = module.toString

		//TODO really should wrap this in a closure and pass these vars in rather than making global
		module.toString = function()   							  //Insert code into first user module
		{
			var str  = ng.version.name+' = angular\n'			  //Allow alternative namespace

				 str += ng.version.name+".version.name = '"+ng.version.name+"'\n"

				 str += ng.version.name+".version.ng   = '"+ng.version.ng+"'"

				 str += ng.module('$rpc')							  //Add $rpc boilerplate

				 str += toString()

			return str
		}

		log.gray.bold.temp('\nng started')

		injector = ng.bootstrap(null, requires)				  //Start angular and get actual injector
	})
}
