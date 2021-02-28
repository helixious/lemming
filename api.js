exports.printMsg = () => {
    console.log('Lemming Express API Limiter')
}

module.exports = class Lemming {
    constructor({interval, limit, redis, prefix = 'ip', namespace}) {
        if(typeof interval !== 'number') {
            throw new TypeError('interval must be a number');
        }
        if(typeof limit !== 'number') {
            throw new TypeError('limit must be a number');
        } else if(limit <= 0) {
            throw new TypeError('limit must be > 0');
        }
        if(!redis || typeof redis.eval !== 'function') {
            throw new TypeError('redis must be an instance of Redis Client')
        }

        if(typeof namespace !== 'string') {
            throw new TypeError('namespace must be a string');
        }

        if(typeof prefix !== 'string') {
            throw new TypeError('prefix must be a string');
        }

        this._interval = interval;
        this._limit = limit;
        this._redis = redis;
        this._namespace = namespace;
        this._prefix = !/:$/.test(prefix) ? prefix += ':' : prefix;
    }

    updateKey(refId) {
        const {_redis, _limit, _interval, _namespace, _prefix} = this;
        let initObject = false;
        let result = {statusCode: 200};
        // console.log(refId)
        return  new Promise((resolve, reject) => {

            try {
                let key = `${_namespace}:${_prefix}${refId}`;
                _redis.watch(key);
                _redis.multi()
                    .get(key, (err, data) => {
                        if (!data) {
                            initObject = [new Date().getTime()];
                            _redis.set(key, JSON.stringify(initObject), 'EX', _interval);
                        } else {
                            data = JSON.parse(data);
                            if (data.length < _limit) {
                                data.push(new Date().getTime())
                                _redis.set(key, JSON.stringify(data), 'KEEPTTL');
                            } else {
                                result.statusCode = 429;
                            }
                        }
                    })
                    .ttl(key).exec((error, reply) => {
                        let [attempts, timeLeft] = reply;
                        attempts = JSON.parse(attempts);
                        if (!attempts) attempts = initObject;
                        result.timeLeft = timeLeft > 0 ? timeLeft : 0;
                        result.attempts = attempts;
                        if (error) result.statusCode = 500;
                        resolve(result)
                    })
            } catch(e) {
                reject(e);
            }
        })
    }

    limiter(refId) {
        let {_interval, _limit, _redis, _prefix} = this;
        return new Promise((resolve, reject) => {
            _redis.get(`${_prefix}`)
        });
    }
    route = (req, res, next) => {
        if(req.originalUrl == '/favicon.ico') {
            res.status(204).json({});
            return next();
        }
        
        this.updateKey(req.ip).then(result => {
            let { statusCode, attempts, timeLeft} = result;
            
            // setting response headers
            res.set('X-RateLimit-Limit', this._limit);
            res.set('X-RateLimit-Remaining', this._limit-attempts.length);
            res.set('X-RateLimit-Reset', timeLeft);
            if(statusCode !== 200) {
                res.sendStatus(statusCode);
            } else {
                next();
            }
        });
    }
}