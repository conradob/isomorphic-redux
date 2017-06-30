'use strict';

require('babel-core/register')({});
require('babel-polyfill');

var server = require('./server').default;

const PORT = process.env.PORT || 3000;

server.start()
    .then(() => server.log( [ 'info', 'startup' ], server.info))
