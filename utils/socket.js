const models = require('../models')
const Op = models.sequelize.Op
const io = require('socket.io')();
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const {resetGame, getGame, setGame, getQuestion, setQuestion} = require('../utils/gameRedis')

// redis backend for socket connections
const redisAdapter = require('socket.io-redis');
io.adapter(redisAdapter({
    host: config.redis.host,
    port: config.redis.port
}));

// io emitter
const emitter = require('socket.io-emitter')({
    host: config.redis.host,
    port: config.redis.port
});

// redis storage
const Redis = require('ioredis');
const redis = new Redis(config.redis.port, config.redis.host);

// error handling of redis
emitter.redis.on('error', onError);

function onError(err) {
    console.log(err);
}

const EventEmitter = require('events');

// Event Emitter for game
class GameEvent extends EventEmitter {
}

const gameEmitter = new GameEvent();

const totalUsers = 0;


gameEmitter.on('start_game', (data) => {
    if (data) {
        gameId = data.gameId

        setGame({
            gameId: gameId,
            currentQuestionIndex: 0,
            totalQuestions: data.totalQuestions,
            currentQuestionId: null,
            dateOpened: data.dateGameOpened,
            dateStarted: null,
            dateFinished: null,
            dateClosed: null,
            numberOfAttendees: 0,
            canQuestionUp: true,
            state: 'Starting'
        }, redis)

        gameEmitter.emit('game_stats', data);
    }
})

gameEmitter.on('game_stats', (data) => {

    let gameStats = setInterval(function () {

        getGame(redis).then(game => {

            if (!game) {
                clearInterval(gameStats);
            }

            if (game.state = "Finished") {
                clearInterval(gameStats);
            }

            emitter.emit('game_stats', {
                totalUsers: totalUsers
            });

        }).catch(err => {
            console.log(err.message)
        })

    }, 2000);
})

gameEmitter.on('question_up', (data) => {
    if (data && data.question) {

        getGame(redis).then(game => {

            if (game.canQuestionUp) {

                if (game.currentQuestionIndex == 0 && game.state == 'Starting') {
                    game.state = 'Started'
                }

                game.currentQuestionIndex += 1
                game.currentQuestionId = data.question.id
                game.canQuestionUp = false

                setQuestion(data.question, redis)
                setGame(game, redis)

                io.emit('question_up', {
                    gameId: game.gameId,
                    questionIndex: game.currentQuestionIndex,
                    questionId: game.currentQuestionId,
                    questionText: data.question.question_title,
                    a1: data.question.answer_1,
                    a2: data.question.answer_2,
                    a3: data.question.answer_3,
                    time: 10,
                });

                let counter = 10;
                let questionCountdown = setInterval(function () {
                    io.emit('timer', {counter: counter});
                    counter--
                    if (counter < 0) {
                        io.emit('timer', {counter: 0});
                        getGame(redis).then(game => {
                            game.canQuestionUp = true
                            setGame(game, redis)
                            clearInterval(questionCountdown);
                        })
                    }
                }, 1000);
            }

        }).catch(err => {
            console.log(err.message)
        })
    }
})


gameEmitter.on('question_down', (data) => {

    getGame(redis).then(game => {

        if (game.canQuestionUp) {
            emitter.emit('question_down', {
                gameId: game.gameId,
                questionId: game.currentQuestionIndex
            });
        }

    }).catch(err => {
        console.log(err.message)
    })
})

gameEmitter.on('answer_down', (data) => {

    getGame(redis).then(game => {

        emitter.emit('answer_down', {
            gameId: game.gameId,
            questionId: game.currentQuestionIndex
        });

    }).catch(err => {
        console.log(err.message)
    })
})

gameEmitter.on('answer_up', (data) => {
    if (data) {
        emitter.emit('answer_up', data.result);
    }
})

gameEmitter.on('leave', (data) => {
    if (data) {
        isGameStarted = false

        getGame(redis).then(game => {
            game.dateClosed = data.dateGameClosed
            game.state = "Finished"

            setGame(game, redis)

            emitter.emit('leave', {gameId: game.gameId});

        }).catch(err => {
            console.log(err.message)
        })
    }
})

gameEmitter.on('reset', (data) => {
    if (data) {

        getGame(redis).then(game => {
            game.dateClosed = data.dateGameClosed
            game.state = 'Finished'

            resetGame(redis)
            emitter.emit('leave', {gameId: game.gameId});

        }).catch(err => {
            console.log(err.message)
        })
    }
})

gameEmitter.on('result_up', (data) => {
    if (data) {

        getGame(redis).then(game => {

            game.state = 'Finished'
            setGame(game, redis)

            emitter.emit('result_up', {
                gameId: game.gameId,
                result: data.result
            });

        }).catch(err => {
            console.log(err.message)
        })
    }
})

gameEmitter.on('result_down', (data) => {

    getGame(redis).then(game => {

        game.state = 'Finished'
        setGame(game, redis)

        emitter.emit('result_down', {
            gameId: game.gameId,
        });

    }).catch(err => {
        console.log(err.message)
    })
})


// Check User Authentication
io.use(function (socket, next) {
    if (socket.handshake.query && socket.handshake.query.token) {

        /* you should implement users authentication and users table by yourself base on JWT or Oauth2  */

        socket.userId = "Get from your user's table"
        socket.avatarId = "Get from your user's table"
        socket.displayName = "Get from your user's table"

        next();

    } else {
        next(new Error('Authentication error'));
    }
}).on('connection', function (socket) {

    socket.use((packet, next) => {
        // Handler
        next();
    });

    socket.on('join', (data) => {
        data = JSON.parse(data)
        this.totalUsers++;

        return models.sequelize.transaction(t => {

            return getGame(redis).then(game => {

                if (game.state == 'Starting') {

                    return models.game__users.findOrCreate({
                        where: {
                            user_id: {[Op.eq]: socket.userId},
                            game_id: {[Op.eq]: game.gameId},
                        },
                        defaults: {
                            user_id: socket.userId,
                            game_id: game.gameId,
                            user_game_status: 'Active',
                            user_type: 'Player'
                        },
                        transaction: t
                    }).spread((gameUser, isCreated) => {

                        if (gameUser) {
                            socket.userStatus = 'Active'
                            socket.gameId = game.gameId
                        }
                    })
                }
            })

        }).then(result => {
            console.log(result)
        }).catch(err => {
            console.log(err.message)
        })
    })

    socket.on('answer', (data) => {
        data = JSON.parse(data)

        if (socket.userStatus != 'Active' || !data || !data.userAnswer)
            return socket.error('Authentication error - userStatus or gameId is not correct')

        return models.sequelize.transaction(t => {

            return getGame(redis).then(game => {

                return getQuestion(game.currentQuestionId, redis).then(question => {

                    let isCorrect = (data.userAnswer == question.correct_answer) ? 'Yes' : 'No'

                    return models.user__game_logs.findOrCreate({
                        where: {
                            user_id: {[Op.eq]: socket.userId},
                            game_id: {[Op.eq]: game.gameId},
                            question_id: {[Op.eq]: game.currentQuestionId},
                        },
                        defaults: {
                            user_id: socket.userId,
                            game_id: game.gameId,
                            question_id: game.currentQuestionId,
                            answer: data.userAnswer,
                            status: 'Answered',
                            is_correct: isCorrect
                        },
                        transaction: t
                    }).spread((gameLog, isCreated) => {

                        gameLog.answer = data.userAnswer
                        gameLog.is_correct = isCorrect
                        gameLog.status = 'Answered'

                        return gameLog.save({transaction: t}).then(() => {

                            // if questionIndex is last and user answer is correct so the user is one of the winners
                            if (game.totalQuestions == game.currentQuestionIndex && isCorrect) {
                                return models.game__users.update({
                                    is_winner: 'Yes'
                                }, {
                                    transaction: t,
                                    where: {
                                        game_id: {[Op.eq]: game.gameId},
                                        user_id: {[Op.eq]: socket.userId},
                                    }
                                })
                            }
                        })
                    })
                })
            })

        }).catch(function (err) {
            console.log(err)
        })
    });

    socket.on('question_up_ack', (data) => {
        data = JSON.parse(data)

        if (socket.userStatus != 'Active')
            return socket.error('Authentication error - userStatus is not correct')

        return models.sequelize.transaction(t => {

            return getGame(redis).then(game => {

                return models.user__game_logs.findOrCreate({
                    where: {
                        user_id: {[Op.eq]: socket.userId},
                        game_id: {[Op.eq]: game.gameId},
                        question_id: {[Op.eq]: game.currentQuestionId},
                    },
                    defaults: {
                        user_id: socket.userId,
                        game_id: game.gameId,
                        question_id: game.currentQuestionId,
                        date_question_ack: new Date()
                    },
                    transaction: t
                }).spread((gameLog, isCreated) => {

                    if (isCreated) {
                        console.log(gameLog.dataValues)
                    }
                })
            })
        }).catch(function (err) {
            console.log(err)
        })
    });

    socket.on('question_down_ack', (data) => {
        data = JSON.parse(data)
    });

    socket.on('answer_up_ack', (data) => {
        data = JSON.parse(data)
    });

    socket.on('answer_down_ack', (data) => {
        data = JSON.parse(data)
    });

    socket.on('ack', (data) => {
        data = JSON.parse(data)
    });

    socket.on('error', (error) => {
        console.log(error);
    });

    socket.on('reconnect', (data) => {
        console.log('...reconnected:' + socket.id)
    });

    socket.on('disconnecting', (reason) => {
        console.log(Object.keys(socket.rooms));
    });

    socket.on('disconnect', (data) => {
        this.totalUsers--;
    })

});

module.exports = {io, gameEmitter, redis};
