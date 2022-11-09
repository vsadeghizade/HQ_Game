const express = require('express');
const router = express.Router();
const models = require('../models');

const {check, validationResult, oneOf} = require('express-validator/check');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const Op = models.sequelize.Op
const {getGame} = require('../utils/gameRedis')


/**
 * @api {post} /start/:gameId This method prepares the game params and changes the game status to Starting value
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/start/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),
], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            // check the game status and change the status to Starting if that is Active
            if (game.game_status === 'Active') {
                game.game_status = 'Starting'
                game.date_opened = new Date()
                game.game_date = game.date_opened

                return game.save({transaction: t}).then(() => {
                    res.gameEmitter.emit('start_game', {
                        gameId: game.id,
                        dateGameOpened: game.date_opened,
                        totalQuestions: game.total_questions
                    })
                    return {
                        result: 'Success'
                    }
                })
            } else {

                // check game status and throw error
                if (game.game_status === 'Starting') {
                    throw {status: 409, message: 'The game is starting'};
                } else if (game.game_status === 'Started') {
                    throw {status: 409, message: 'The game is being held'};
                } else if (game.game_status === 'Finished') {
                    throw {status: 409, message: 'The game is over'};
                }
            }

        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})


/**
 * @api {post} /stop/ Stop the game
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret Code
 */
router.post('/stop/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),
], (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {

        let dateGameClosed = new Date()

        // update game status and date game closed to mysql database
        return models.game.update({
            game_status: 'Finished',
            date_closed: dateGameClosed,
        }, {
            where: {
                id: {[Op.eq]: req.params.gameId},
            },
            transaction: t
        }).then(updateGame => {

            if (updateGame) {

                // emit game status to the clients
                res.gameEmitter.emit('leave', {gameId: req.params.gameId, dateGameClosed: dateGameClosed})
                return {
                    result: "Success"
                }
            }
        })

    }).then((jsonOutput) => {
        res.status(200).json({status: 200, status_text: 'OK', content: jsonOutput})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })

});


/**
 * @api {post} /question-up/:gameId Show the question to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret Code
 */
router.post('/question-up/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            let dateGameStarted
            if (game.date_started) {
                dateGameStarted = game.date_started
            }

            // get the next question to broadcast to users
            return models.game__questions.getCurrentQuestion(req.params.gameId, t).then(question => {

                // check the question is exist
                if (!question) {
                    throw {status: 409, message: 'There are no other questions to submit'};
                }

                // check if the game status is "Starting" that change to "Started""
                if (game.game_status == 'Starting') {
                    game.game_status = 'Started'
                    game.date_started = new Date()
                    dateGameStarted = game.date_started
                }

                game.current_question = question.id

                // update the game new status in mysql database
                return game.save({transaction: t}).then((updateGame) => {

                    // broadcast the next question to users
                    res.gameEmitter.emit('question_up', {
                        gameId: game.id,
                        question: question,
                        dateGameStarted: dateGameStarted
                    })

                    return {
                        questionId: game.current_question,
                        questionIndex: question.priority,
                        totalQuestion: game.total_questions,
                        question: question,
                    }
                })
            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})


/**
 * @api {post} /question-down/:gameId Eliminate the question to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/question-down/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            // update question publish status
            return models.game__questions.update({
                is_published: 'Yes',
                date_published: new Date()
            }, {
                transaction: t,
                where: {
                    question_id: {[Op.eq]: game.current_question},
                    game_id: {[Op.eq]: req.params.gameId}
                }
            }).then(() => {
                return game.save({transaction: t}).then(() => {

                    // broadcast to eliminate the question to users
                    res.gameEmitter.emit('question_down', {gameId: game.id})
                    return {
                        result: 'Success'
                    }
                })
            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})


/**
 * @api {post} /answer-up/:gameId Show the answer to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/answer-up/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            if (!game.current_question) {
                throw {status: 409, message: 'There are no questions displayed yet'};
            }

            // use promise props to execute several requests
            return models.sequelize.Promise.props({
                question: models.question_cache.findOne({
                    where: {
                        id: {[Op.eq]: game.current_question}
                    },
                    transaction: t
                }),
                answerStats: models.game__questions.getAnswerStats(game.id, game.current_question, t),
                currentGame: getGame(res.redis)

            }).then(result => {

                let correctAnswer = parseInt(result.question.correct_answer)

                let totalCount = (result.answerStats) ? (parseInt(result.answerStats.a1Count) + parseInt(result.answerStats.a2Count) + parseInt(result.answerStats.a3Count)) : 0

                // calculate the percentage of each answer item
                let a1Percentage = (result.answerStats) ? Math.floor((parseInt(result.answerStats.a1Count) / parseInt(result.answerStats.totalCount)) * 100) : 0;
                let a2Percentage = (result.answerStats) ? Math.floor((parseInt(result.answerStats.a2Count) / parseInt(result.answerStats.totalCount)) * 100) : 0;
                let a3Percentage = (result.answerStats) ? Math.floor((parseInt(result.answerStats.a3Count) / parseInt(result.answerStats.totalCount)) * 100) : 0;

                let json = {
                    totalQuestions: result.currentGame.totalQuestions,
                    gameId: game.id,
                    questionId: result.question.id,
                    questionIndex: result.currentGame.currentQuestionIndex,
                    questionText: result.question.question_title,
                    a1: result.question.answer_1,
                    a2: result.question.answer_2,
                    a3: result.question.answer_3,
                    a1Count: (result.answerStats) ? result.answerStats.a1Count : 0,
                    a2Count: (result.answerStats) ? result.answerStats.a2Count : 0,
                    a3Count: (result.answerStats) ? result.answerStats.a3Count : 0,
                    a1Percentage: a1Percentage,
                    a2Percentage: a2Percentage,
                    a3Percentage: a3Percentage,
                    totalCount: totalCount,
                    correctAnswer: correctAnswer,
                    totalWrongAnswer: (result.answerStats) ? result.answerStats.totalWrongAnswer : 0,
                    totalCorrectAnswer: (result.answerStats) ? result.answerStats.totalCorrectAnswer : 0,
                }

                // update answers statistics in mysql database
                return models.game__questions.update({
                    total_answers: totalCount,
                    correct_answers_count: json.totalCorrectAnswer,
                    wrong_answers_count: json.totalWrongAnswer,
                    answer_1_count: (json.a1Count) ? json.a1Count : 0,
                    answer_2_count: (json.a2Count) ? json.a2Count : 0,
                    answer_3_count: (json.a3Count) ? json.a3Count : 0,
                }, {
                    where: {
                        question_id: {[Op.eq]: result.question.id},
                        game_id: {[Op.eq]: game.id},
                    }
                }).then(() => {

                    // broadcast to show the answer to users
                    res.gameEmitter.emit('answer_up', {
                        gameId: game.id,
                        result: json
                    })

                    return json;
                })
            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})

/**
 * @api {post} /answer-down/:gameId Eliminate the answer to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/answer-down/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            // broadcast to show the answer to users
            res.gameEmitter.emit('answer_down', {gameId: game.id})
            return {
                result: 'Success'
            }
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})

/**
 * @api {post} /result-up/:gameId Show game result to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/result-up/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {

    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t

        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            // get totalWinners and winners's userIds from mysql database
            return models.sequelize.Promise.props({
                totalWinners: models.game__users.count({
                    where: {
                        game_id: {[Op.eq]: game.id},
                        is_winner: {[Op.eq]: 'Yes'}
                    },
                    transaction: t
                }),
                winners: models.game__users.findAll({
                    attributes: [
                        ['user_id', 'userId'],
                    ],
                    where: {
                        game_id: {[Op.eq]: game.id},
                        is_winner: {[Op.eq]: 'Yes'}
                    },
                    transaction: t
                })

            }).then(result => {

                let winners = []
                let prizePerUser = Math.round(game.prize_price / result.totalWinners)

                if (result.winners) {
                    // assign a prize to each user, you should implement user table and get displayName, avatarId by your self
                    result.winners.forEach(winner => {
                        winners.push({
                            userId: winner.userId,
                            displayName: "Get from your user's table",
                            avatarId: "Get from your user's table",
                            creditWon: prizePerUser
                        })
                    })
                }

                // broadcast to show game result to users
                res.gameEmitter.emit('result_up', {
                    gameId: game.id,
                    result: {winners: winners}
                })

            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})

/**
 * @api {post} /result-down/:gameId Eliminate game result to users by broadcasting
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/result-down/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),
], (req, res, next) => {

// Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {
        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            let dateGameClosed

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};
            if (game.game_status == 'Started') {
                // change game status to "Finished" and save in mysql database
                game.game_status = 'Finished'
                game.date_closed = new Date()
                dateGameClosed = game.date_closed
            }

            return game.save({transaction: t}).then((updateGame) => {

                // broadcast to eliminate game result to users
                res.gameEmitter.emit('result_down', {
                    gameId: game.id,
                    dateGameClosed: dateGameClosed
                })

                return {
                    result: 'Success'
                }
            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})


/**
 * @api {post} /reset/:gameId Rest all game data
 * @apiVersion 1.0.0
 * @apiGroup Api
 * @apiParam {Number} gameId Game Id
 * @apiParam {Number} gameSecret GameSecret
 */
router.post('/reset/:gameId', [
    check('gameId').exists().withMessage('gameId is required'),
    check('gameSecret').exists().withMessage('gameSecret is required'),

], (req, res, next) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({status: 422, status_text: 'Error sending data', errors: errors.array()});
    }

    return models.sequelize.transaction(t => {

        return models.game.findOne({
            where: {
                id: {[Op.eq]: req.params.gameId}
            },
            transaction: t
        }).then(game => {

            // check the game is exist
            if (!game)
                throw {status: 404, message: 'gameId is not correct'};
            if (game.secret_code !== req.body.gameSecret)
                throw {status: 404, message: 'gameSecret is not correct'};

            // reset all game data
            game.game_status = 'Active'
            game.date_started = null
            game.date_opened = null
            game.date_finished = null
            game.date_closed = null
            game.current_question = null

            return models.sequelize.Promise.props({
                // removal users who attended the game
                gameUsers: models.game__users.destroy({
                    where: {
                        game_id: {[Op.eq]: req.body.gameId},
                    }
                }),
                // removal users logs
                gameUserslogs: models.user__game_logs.destroy({
                    where: {
                        game_id: {[Op.eq]: req.body.gameId},
                    }
                }),
                // removal game questions
                gameQuestions: models.game__questions.update({
                    is_published: 'No',
                    total_answers: null,
                    wrong_answers_count: null,
                    correct_answers_count: null,
                    answer_1_count: null,
                    answer_2_count: null,
                    answer_3_count: null,
                    answer_4_count: null,
                }, {
                    where: {
                        game_id: {[Op.eq]: game.id},
                    }
                }),
                // save the game's data that were reset
                game: game.save({transaction: t})

            }).then(result => {
                res.gameEmitter.emit('reset', {gameId: req.params.gameId})

                return {
                    result: 'Success'
                }
            })
        })

    }).then((json) => {
        res.status(200).json({status: 200, status_text: 'OK', content: json})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })
})


module.exports = router;

