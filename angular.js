'use strict'

// Pook Framework > copyright Adam Kircher > adam.kircher@gmail.com
// ----------------------------------------------------------------
// Reload makes use of each interface's consistent api in order
// to start a dynamic cluster of servers regardless of the spis
// choosen by the developer to build her custom bundle & cluster
// part of Pook 'N Cheek Global Enterprises
// Remove need to prepend node_preloaded/ to beginning of every path

module.exports = function(modules, callback)
{
	var window  = require('./window')
	  , log     = require('./logger')
	  , loaded  = {}

	if ( ! modules || ! modules.ng)
	{
		return log.red(Error('At minimum, provide a modules object with an ng property, e.g., {ng:"url/orFilePath/to/angular.js}'))
	}

	//Freezes name in the for loop
	function load(name)
	{
		return function(err, js)
		{
			if (err == 404)
			{
				return log.red(Error(modules[name]))
			}

			if (err && 'object' == typeof err)
			{
				return log.red(Error(err))
			}

			loaded[name] = js

			//Since loaded asyncronously we need to keep count to know when we are done
			if (Object.keys(loaded).length == Object.keys(modules).length)
			{
				for (var i in modules)
				{  //Load the preloaded modules into node using our "fake" window, navigator, & document objects
					require('vm').runInNewContext(loaded[i], window, modules[i])
				}

				//Preserve the original order of modules
				window.angular.module._cache = {}

				for (var i in modules)
				{
					window.angular.module._cache[i] = loaded[i]
				}

				//Provide ng with a reference to angular
				callback(window.angular)
			}
		}
	}

	//Goto through each of the module dependencies the user specifies
	for (var i in modules)
	{
		//Check if dependency is a url or a file path
		var isUrl = modules[i].indexOf('//')

		if (isUrl == -1)
		{
			//Read the file path into a utf8 string
			require('fs').readFile(modules[i], 'utf8', load(i))
		}
		else
		{
			//Assume http for protocol-less urls otherwise node errors
			var path = (isUrl ? '' : 'http:')+modules[i]

			require('./request')('get', path, true, load(i))
		}
	}
}