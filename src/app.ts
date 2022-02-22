import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Listener } from './modules/listener';
import db from './modules/database';
import { makeQuery } from './utils/apiHelper';
import { IContractSchema, IEventSchema, ITokenSchema } from './utils/types';

const app = express();
const port = 3000;

let listener: Listener;
try {
  listener = new Listener(db);
} catch (e) {
  Sentry.captureException(e);
  console.error(e);
}

Sentry.init({
  dsn: 'https://b0559d6508694b5da9915e251e3dbb48@o1146133.ingest.sentry.io/6214565',
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// cross origin reques
app.use(cors());
// RequestHandler creates a separate execution context using domains,
// so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(bodyParser.json());

// All controllers should live here

app.get('/tests/:address/:network', (req, res) => {
  const obj = makeQuery<IContractSchema>(req.params, req.query);
  console.log(obj);
  db.fetchContract(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

// GET contracts
app.get('/contracts/:address/:network', (req, res) => {
  const obj = makeQuery<IContractSchema>(req.params, req.query);

  // db.fetchContract(req.params)
  //   .then((result) => res.json(result))
  //   .catch((err) => res.json(err));
});

app.get('/contracts/:address', (req, res) => {
  // db.fetchContract(req.params)
  //   .then((result) => {
  //     if (result.length > 0) {
  //       console.info(`Contract found`);
  //       Sentry.addBreadcrumb({
  //         message: `Contract found.`,
  //         data: req.query,
  //       });
  //     } else {
  //       console.info(`Could not find contract.`);
  //       Sentry.addBreadcrumb({
  //         message: `Contract not found.`,
  //         data: req.query,
  //       });
  //     }
  //     res.json(result);
  //   })
  //   .catch((err) => {
  //     console.info(`Encountered error while getting contract.`);
  //     Sentry.addBreadcrumb({
  //       message: `Error getting contract.`,
  //       data: { error: err, ...req.query },
  //     });
  //     res.json(err);
  //   });
});

// app.get('/contracts', (req, res) => {
//   db.fetchContract(req.params)
//     .then((result) => {
//       if (result.length > 0) {
//         console.info(`Contract found`);
//         Sentry.addBreadcrumb({
//           message: `Contract found.`,
//           data: req.query,
//         });
//       } else {
//         console.info(`Could not find contract.`);
//         Sentry.addBreadcrumb({
//           message: `Contract not found.`,
//           data: req.query,
//         });
//       }
//       res.json(result);
//     })
//     .catch((err) => {
//       console.info(`Encountered error while getting contract.`);
//       Sentry.addBreadcrumb({
//         message: `Error getting contract.`,
//         data: { error: err, ...req.query },
//       });
//       res.json(err);
//     });
// });

// POST tokens
app.post('/tokens/:address/:network/:tokenId', (req, res) => {
  db.insertToken({
    ...req.params,
    data: {
      ...req.query,
    },
  })
    .then((result) => {
      if (result) {
        console.info(`Added token ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Token added.`,
          data: { result: result.msg },
        });
      } else {
        console.info(`Could not add token ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Token not added.`,
          data: { result: result.msg },
        });
      }
      res.json(result);
    })
    .catch((err: Error) => {
      const tokenObj = {
        ...req.params,
        data: {
          ...req.query,
        },
      };
      console.info(
        `Encountered error while inserting token ${tokenObj}.
           Error: ${err.message}`,
      );
      Sentry.addBreadcrumb({
        message: `Error inserting token.`,
        data: { error: err, body: tokenObj },
      });
      res.json(err);
    });
});

// POST contracts
app.post('/contracts', (req, res) => {
  // console.info(req.body, req.params, req.query, req);
  db.insertContract(req.body)
    .then((result) => {
      if (result) {
        console.info(`Added contract ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Contract added.`,
          data: { result: result },
        });
      } else {
        console.info(`Could not add contract ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Contract not added.`,
          data: { result: result },
        });
      }
      res.json(result);
    })
    .catch((err: Error) => {
      console.info(
        `Encountered error while inserting contract ${req.body}.
         Error: ${err.message}`,
      );
      Sentry.addBreadcrumb({
        message: `Error inserting contract.`,
        data: { error: err, body: req.body },
      });
      res.json(err);
    });
});

// PUT contract
app.put('/contracts/:id', (req, res) => {
  const data = { ...req.body, ...req.params };
  db.updateContract(data)
    .then((doc) => {
      if (!doc) {
        console.info(`Invalid address. Not updated `);
        Sentry.addBreadcrumb({
          message: `Contract not updated.`,
          data: data,
        });
      } else {
        console.info(`Contract updated`);
        Sentry.addBreadcrumb({
          message: `Contract updated.`,
          data: { ...req.body, ...req.params },
        });
      }
      res.json(doc);
    })
    .catch((err) => {
      console.info(`Encountered error while updating contract`);
      Sentry.addBreadcrumb({
        message: `Error updating contract.`,
        data: {
          error: err,
        },
      });
      res.json(err);
    });
});

// DELTE contract
app.delete('/contracts/:id', (req, res) => {
  const data = req.params.id;
  db.deleteContract(data)
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      res.json(err);
    });
});

// EVENTS

// GET
app.get('/events/:address', (req, res) => {
  const obj = makeQuery<IEventSchema>(req.params as any, req.query);
  db.fetchEvent(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});
app.get('/events', (req, res) => {
  const obj = makeQuery<IEventSchema>(req.params as any, req.query);
  db.fetchEvent(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

app.get('/tokens/:address/:network/:tokenId', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});
app.get('/tokens/:address/:tokenId', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});
app.get('/tokens/:address/:network', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});
app.get('/tokens/:address', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});
app.get('/tokens', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

// The error handler must be before any other error middleware
// and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  console.error(err);
  // eslint-disable-next-line no-param-reassign
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.listen(port, () => {
  return console.info(`Express is listening at http://localhost:${port}`);
});
