import Redis from 'redis';

exports.printMsg = () => {
    console.log('Lemming Express API Limiter')
}

export default class Lemming {
    constructor({interval, limit, redis, prefix = '', namespace}) {
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
        const {_redis, _limit, _namespace, _prefix } = this;
        let initObject = false;
        // console.log(refId)
        return  new Promise((resolve, reject) => {
            let key = `${_namespace}:${_prefix}${refId}`;
            _redis.watch(key);
            _redis.multi()
            .get(key, (err, data) => {
                if(!data) {
                    initObject = [new Date().getTime()];
                    _redis.set(key, JSON.stringify(initObject), 'EX', 60);
                } else {
                    data = JSON.parse(data);
                    if (data.length < _limit) {
                        console.log(data.length);
                        data.push(new Date().getTime())
                        _redis.set(key, JSON.stringify(data), 'KEEPTTL');
                    } else {
                        reject('Exceeded API limit');
                    }
                }
            })
            .ttl(key).exec((error, reply) => {
                let [attempts, timeLeft] = reply;
                attempts = JSON.parse(attempts);
                if(!attempts) attempts = initObject;
                timeLeft = timeLeft > 0 ? timeLeft : 0;
                let result = {attempts, timeLeft};
                if(error) return reject(error);
                resolve(result)
            })
        })
    }
    limiter(refId) {
        let {_interval, _limit, _redis, _prefix} = this;
        return new Promise((resolve, reject) => {
            _redis.get(`${_prefix}`)
        });
    }
}