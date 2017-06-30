import Hapi                      from 'hapi';
import inert from 'inert'
import React                     from 'react';
import { renderToString }        from 'react-dom/server'
import { RoutingContext, match } from 'react-router';
import createLocation            from 'history/lib/createLocation';
import routes                    from 'routes';
import { Provider }              from 'react-redux';
import * as reducers             from 'reducers';
import promiseMiddleware         from 'lib/promiseMiddleware';
import fetchComponentData        from 'lib/fetchComponentData';
import { createStore,
         combineReducers,
         applyMiddleware }       from 'redux';
import path                      from 'path';

let server = new Hapi.Server({ debug : { log : [ 'info', 'request' ] } })

server.connection({
    host : '0.0.0.0',
    port : 8000,
    routes : {
        cors : {
            origin : [ '*' ],
            additionalHeaders : [ 'Range' ],
            additionalExposedHeaders : [ 'Content-Range', 'X-KNLEDG-VERSION' ],
       }
    }
})

if (process.env.NODE_ENV !== 'production') {
  require('./webpack.dev').default(server);
}

server.register([inert], err => {
  server.route({
    method : 'GET',
    path : '/assets/{param*}',
    handler : {
      directory : {
        path : 'dist'
      },
    },
  })

  server.route({
    method : 'GET',
    path : '/',
    config : {
      handler : (req, reply) => {
          const location = createLocation(req.url);
          const reducer  = combineReducers(reducers);
          const store    = applyMiddleware(promiseMiddleware)(createStore)(reducer);

          match({ routes, location }, (err, redirectLocation, renderProps) => {
            if(err) {
              console.error(err);
              return res.status(500).end('Internal server error');
            }

            if(!renderProps)
              return res.status(404).end('Not found');

            function renderView() {
              const InitialView = (
                <Provider store={store}>
                  <RoutingContext {...renderProps} />
                </Provider>
              );

              const componentHTML = renderToString(InitialView);

              const initialState = store.getState();

              const HTML = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>Redux Demo</title>

                  <script>
                    window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
                  </script>
                </head>
                <body>
                  <div id="react-view">${componentHTML}</div>
                  <script type="application/javascript" src="/assets/bundle.js"></script>
                </body>
              </html>
              `;

              return HTML;
            }

            fetchComponentData(store.dispatch, renderProps.components, renderProps.params)
              .then(renderView)
              .then(html => reply(html))
              .catch(err => reply(err.message));
          });
      },
      auth : false,
    }
  })
})

export default server;
