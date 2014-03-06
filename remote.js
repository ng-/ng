'use strict'

// Pook Framework > copyright Adam Kircher > adam.kircher@gmail.com
// ----------------------------------------------------------------

//Client side compiles url for a remote procedure call (rpc): http://server.com/rpc/db?method1=["param1", "param2"]&method2=["param1", "param2"]
//which translates into db.method1(param1, param2).method2(param1, param2). The syntax is inspired by json-rpc but simpler and allows for method
//chaining. In the example url "/rpc/" allows for interceptors to easily differentiate our calls others in order to modify or ignore them. "db"
//is the service that will be injected & called on the server.  And then we will simply call the methods in the order given (no alphabatizing!)
//with the parameters given (using Function.apply).  Once all methods are run we will return the value returned by the last method (the trigger).

//Compile the URL with multiple chained methods and one trigger method
exports.client = function($http, $cacheFactory)
{
   var params = {}
     , cached = $cacheFactory('service')

   return function(name, method, type)
   {
      params[name] = ''

      function trigger()
      {
         //Angular sorts http parameters into alphabetical order which means our execution order
         //is messed up so we need to JSONIFY the params ourselves and pass it with the URL
			// encodeURIComponent: angular treats "+" as a space replacing with %20 and # would prematurely cut off the request URI, for args we want to escape a literal +
         params[name] += method+'='+encodeURIComponent(ng.toJson([].slice.call(arguments)))

         var path = '/rpc/'+name+'?'+params[name]

         //now saved within path, so clear out params for when this service is run again
         params[name] = ''

         //serve cache right away if it exists
         var result  = cached.get(path) || []
           , promise = $http.get(path).then(cache)

         function cache(res)
         {
				if ("application/json" == res.headers["Content-Type"])
				{
					res.data = ng.fromJson(res.data)
				}

            //if out-of-date cache should be updated
            if ( ! ng.equals(result, res.data))
            {
               if (ng.isObject(res.data))
               {
                  for (var i in res.data) result[i] = res.data[i]
               }
               else
               {  //This combined with $sce allows this to work:
                  //$scope.string = function server() { return String }
                  //without the need to use promises
                  result.toJSON = function() { return res.data }
               }

               cached.put(path, res.data)
            }

            return res.data
         }

         result.then     = promise.then
         result.catch    = promise.catch
         result.finally  = promise.finally

         return result
      }

      function chain()
      {
         params[name] += method+'='+ng.toJson([].slice.call(arguments))+'&'

         return this
      }

      return 'chain' == type ? chain : trigger
   }
}

//Parse the url, call the methods, and return the last value
//This is the interceptor that is the middle of our middleware
//chain.  It separates request promises from response promises.
exports.server = function($injector, $q)
{
	var log = require('./logger')

	//Remote procedure calls come in the generic format
	//factory?methodIndex=[jsonOfArgs]&methodIndex=[jsonOfArgs]...
	return function(config)
	{
		//Default value in case middleware has returned undefined
		var url = require('url').parse(config.url || '/', true)

		if ('/rpc/' != url.pathname.slice(0, 5))
		{
			return {config:config}
		}

		//console.log('RAW URL', config.url)

		var rpc = url.pathname.slice(5)
		  , out

		//If not a factory, there is nothing to do
		//TODO should support timeout promises like angular
		if ( ! $injector.has(rpc))
		{
			log('Factory doesnt exist', url.rpc)

			return $q.reject({status:400})
		}

		//Rather than walking through nested objects with keys like
		//"level1.level2.level3. Methods are stored in $rpc property
		//and can be quickly references by their toJson index
		rpc = $injector.get(rpc).$rpc

		try
		{
			//Methods can be chained and should be called sequentially
			//before finally responding to the client
			for (var i in url.query)
			{
				//JSON parse arguments if not already done in the auth config
				url.query[i] = JSON.parse(url.query[i])

				out = rpc[i].apply(null, url.query[i])
			}

			return $q.when(out).then(function(obj)
			{
				if ( ! obj.data)
				{
					obj = {data:obj}
				}

				return obj
			})
		}
		catch (err)
		{
			return $q.reject({status:500, data:err.stack})
		}
	}
}

//Remove annoying quotes around strings that angular puts there
//when interpolating an object using toJson. By calling toJson
//in advance then angular will treat the object as a normal string
//Not sure whether this should be included or be optional.
exports.$sce = function($provide)
{
	$provide.decorator('$sce', function($delegate)
	{
		var valueOf = $delegate.valueOf

		$delegate.valueOf = function(part)
		{
			//Sometimes part is undefined
			if (part && part.toJSON != {}.toJSON)
			{
				part = part.toJSON()
			}

			return valueOf.call(this, part)
		}

		return $delegate
	})
}