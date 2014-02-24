'use strict'

module.exports = function(ngModule)											//Make server & client almost indistinguishable
{
	var logger    = require('./logger')
	  , transform = require('./transform')
	  , intercept = require('./intercept')
     , cache     = ngModule._cache

	return function(name, requires, configFn)								//Replace with same params as angular.module
	{
		if (requires)																//We are making a new module which needs $rpc
		{
			requires.push('$rpc')
		}
		else if ('object' == typeof cache[name])			  				//Return cached module object if available
		{
			return cache[name]
		}

		var module = ngModule(name, requires)								//Create a new module object and module string
		  , string = cache[name] || "\n\nangular.module('"+name+"', "+JSON.stringify(requires)+")"

		module.toString = function()
		{
			return string.replace(/<\/script>/g, '<\\/script>')	  //Scripts cannot contain non-escaped closing tags
		}

		function clientDefault(type)
		{
			return function(one, two)
			{
				if (two)
				{
					string += "\n\n."+type+"('"+one+"', "+two+")"
				}
				else
				{
					string += "\n\n."+type+"("+one+")"
				}
			}
		}

		function extend(type, server, client)
		{
			module[type] = function(one, two)
			{
				module[type].client(one, two)

				if (server)
				{
					module[type].server(one, two)
				}

				return module
			}

			module[type].server = function(one, two)
			{
				if (server)
				{
					if (two)
					{
						two = transform.server.call(module, two, type, one)

						if (two) two.$name = one //fn can get its own name if name was dynamically set

						two && server(one, two)
					}
					else
					{
						one = transform.server.call(module, one, type)

						one && server(one)
					}

					return module
				}

				var msg = type+' cannot be set on the server\n\t'

				log.red(Error(two ? one+' '+msg+two : msg+one))
			}

			module[type].client = function(one, two)
			{
				client = client || clientDefault(type)

				if (two)
				{
					if ('string' != typeof two)
					{
						two = transform.client.call(module, two, type, one)
					}

					two && client(one, two)
				}
				else
				{
					if ('string' != typeof one)
					{
						one = transform.client.call(module, one, type)
					}

					one && client(one)
				}

				return module
			}
		}

		extend('animation')

		extend('config', module.config)

		extend('constant', module.constant)

		extend('controller')

		extend('directive')

		extend('factory', module.factory)

		extend('filter', module.filter)

		extend('provider', module.provider)

		extend('run', module.run)

		extend('service', module.service)

		extend('value', module.value)

		extend('interceptor', intercept.server, clientDefault('config'))

		extend('transform', transform.server, transform.client)    //Enable powerful client & server transforms

		if (configFn)										//configFn is just a shortcut to .config
		{
			module.config(configFn)
		}

		return cache[name] = module					//Return and cache the module
	}
}