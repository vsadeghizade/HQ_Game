'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const cacher = require('sequelize-redis-cache');
const redis = require('redis');

const rc = redis.createClient(config.redis.port, config.redis.host);

fs.readdirSync(__dirname).filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');

    }).forEach(file => {
        const model = sequelize['import'](path.join(__dirname, file));
        db[model.name] = model;
        db[model.name + '_cache'] = cacher(sequelize, rc).model(model.name).ttl(5);
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

const cache = cacher(sequelize, rc).ttl(5)
db.cache = cache

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
