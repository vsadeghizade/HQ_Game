var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
const compression = require('compression');

const gameRouter = require('./routes/game');
const manageRouter = require('./routes/manage');


var app = express();
app.use(compression());
app.disable('x-powered-by');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.io = require('./utils/socket').io;
app.gameEmitter = require('./utils/socket').gameEmitter;
app.redis = require('./utils/socket').redis;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.io = app.io
    res.gameEmitter = app.gameEmitter
    res.redis = app.redis
    next();
});

// routes
app.use('/game/', verifyToken, gameRouter);
app.use('/manage/', verifyToken, manageRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

process.on('uncaughtException', function (err) {
    console.error('uncaught exception:', err.stack || err);
    // orderly close server, resources, etc.
    if (err)
        console.error('Error while closing everything:', err.stack || err);
    // exit anyway
    process.exit(1);
});

module.exports = app;
