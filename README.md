# HQ_Game
![License: MIT][ico-license]

This code has been used in part of my project [Manamo](https://manamo.app) which provides an online HQ game for many of the users who learn English from Manamo consistently, this part of the Manamo had lots of challenges for me therefore I decided to share that with you and I'm hopeful that would be useful.

So here I will share my experience along with a sample code that will demonstrate how to create an HQ online game with Node.js along with MySql and Redis.

Please notice that I used PM2 to run Node.js on CentOS server but you can use alternative options.

I consider this code is a sample and you should implement users authentication and users table by yourself base on JWT or Oauth2.

### Built With

* [![Node][Nodejs.org]][Node-url]
* [![Express][expressjs.com]][Express-url]
* [![socket.io][socket.io]][socket.io-url]
* [![MYSQL][mysql.com]][MYSQL-url]
* [![Redis][redis.io]][Redis-url]

### Packages Used
* Promise - Handle the result of an asynchronous task
* Sequelize - Object Relational Mapper
* Sequelize-redis-cache - Cache MySql tables in Redis
* EventEmitter - Handle custom events module
* Express-validator - Validator and sanitizer functions
* Socket.io-redis - Adapter to enable broadcasting events

## Prerequisite
* node & npm
* MySql
* Redis
* pm2

## Installation
```sh
npm install
```

## Install pm2 globally
```sh
npm install pm2 -g
```

## Setup MySql and Redis
```sh
You should create MySql tables base on (/models/files) then set your MySql and Redis configration in (/config/config.json)
```

## Start application
```sh
NODE_ENV=production PORT=[your preference port] pm2 start /bin/www --name "HQ_Game" --max-memory-restart [your preference memory]

```
## Contributing

All contributions welcome.

## Credits

- [Vahid Sadeghizadeh][link-author]
- [All Contributors][link-contributors]

## License

The MIT License (MIT)
