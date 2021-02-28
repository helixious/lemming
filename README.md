# lemming rate limiter

A Node.js with Redis rate limiter.

## Installation

```
$ npm i lemming-express-api-limiter
```

## Requirements
Redis
Express

## Options
- `interval` - number of seconds from initial request at which the rate limiting period will end
- `limit` - max number of request within set `interval`
- `redis` - a Redis connection instance
- `prefix` - `default=ip` should be named after an identifier passed within request object
- `namespace` - is used in combination

## Result Object
```js

    //added to response header
    .route()
    'X-RateLimit-Limit'
    'X-RateLimit-Remaining'
    'X-RateLimit-Reset'

    // statusCode, timeleft and attempts are returned when using custom
    .updateKey(id).then(result => {
        let { statusCode, timeLeft, attempts} = result;
        if(statusCode !== 200) {
            res.sendStatus(statusCode);
        } else {
            next();
        }
    });
```

## Example
Connect middleware implementation on all or single routes:
```js

const Redis = require('redis');
const Express = require('express');
const APILimiter = require('lemming-express-api-limiter');

const {REDIS_HOST, REDIS_PORT} = process.env;
const app = Express();
const redis = Redis.createClient({
    host: REDIS_HOST || 'localhost',
    port: REDIS_PORT || 6379
});

const mainAPIRateLimit = new APILimiter({
    interval: 60,
    limit: 100,
    redis: redis,
    namespace: '/'
});

const testAPIRateLimitA = new APILimiter({
    interval: 60,
    limit: 10,
    redis: redis,
    namespace: '/api/v1/test'
});

// all routes
app.use(mainAPIRateLimit.route);

// single route
app.get('/api/v1/test', testAPIRateLimitA.route, (req, res, next) => {
    next();
})

app.listen(3000);
```
Connect middleware implementation using custom reference id:
```js

const Redis = require('redis');
const Express = require('express');
const APILimiter = require('lemming-express-api-limiter');

const {REDIS_HOST, REDIS_PORT} = process.env;
const app = Express();
const redis = Redis.createClient({
    host: REDIS_HOST || 'localhost',
    port: REDIS_PORT || 6379
});

const testAPIRateLimitB = new APILimiter({
    interval: 60,
    limit: 10,
    redis: redis,
    prefix: 'user_id',
    namespace: '/api/v1/test2'
});

// single route with custom id
app.get('/api/v2/test2', (req, res, next) => {
    let id = req.user_id; // custom id
    testAPIRateLimitB.updateKey(id).then(result => {
        let { statusCode,  } = result;
        if(statusCode !== 200) {
            res.sendStatus(statusCode);
        } else {
            next();
        }
    });
})

app.listen(3000);
```