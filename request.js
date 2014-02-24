'use strict'

// Pook Framework > copyright Adam Kircher > adam.kircher@gmail.com
// ----------------------------------------------------------------
// Reload makes use of each interface's consistent api in order
// to start a dynamic cluster of servers regardless of the spis
// choosen by the developer to build her custom bundle & cluster
// part of Pook 'N Cheek Global Enterprises
// Remove need to prepend node_preloaded/ to beginning of every path

module.exports = function(method, path, display, end)
{
	var req = require(path.split(':')[0])[method.toLowerCase()](path, function(res)
	{
		//zlib.gunzip(buf, callback)
		var data = ""

		res.on('data', function(chunk)
		{
			if (display)
			{
				var kb = Math.floor(data.length/1000)+'KB\r'

				require('./logger').gray.temp('Loading:', kb)
			}

			data += chunk
		})

		res.on('end', function()
		{
			end(res.statusCode, data, res.headers)
		})
	})

	req.on('error', function(err)
	{
		end(404, err, {})
	})

	return req
}