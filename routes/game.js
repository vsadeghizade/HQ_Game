const express = require('express');
const router = express.Router();
const models = require('../models');

const {check, validationResult, oneOf} = require('express-validator/check');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const Op = models.sequelize.Op
const {getGame} = require('../utils/gameRedis')

/**
 * @api {post} /answer-check/ Alternative option to check users answer through http/https protocol
 * @apiVersion 1.0.0
 * @apiGroup Api
 */
router.post('/answer-check/', (req, res, next) => {

    // check users authentication (you should implement users authentication and users table by yourself base on JWT or Oauth2)
    if (!req.userId) {
        throw {status: 403, message: 'The user is not registered'};
    }

    return models.sequelize.transaction(t => {

        return getGame(res.redis).then(game => {

            return models.sequelize.Promise.props({
                userGameLog: models.user__game_logs.findOne({
                    where: {
                        user_id: {[Op.eq]: req.userId},
                        game_id: {[Op.eq]: game.gameId},
                        question_id: {[Op.eq]: game.currentQuestionId},
                    },
                    transaction: t
                }),
                question: models.question.findOne({
                    where: {
                        id: {[Op.eq]: game.currentQuestionId},
                    }
                }),

            }).then(result => {

                // check user answer
                let isQualified = (result.userGameLog && result.question.dataValues.correct_answer == result.userGameLog.answer) ? true : false;
                let userAnswer = (result.userGameLog) ? result.userGameLog.answer : 0
                let isCorrect = (result.userGameLog.answer == result.question.correct_answer) ? 'Yes' : 'No'
                let json = {
                    gameId: game.gameId,
                    questionId: game.currentQuestionId,
                    questionIndex: game.currentQuestionIndex,
                    isQualified: isQualified,
                    userAnswer: (result.userGameLog && result.userGameLog.answer) ? parseInt(userAnswer) : 0,
                    isWinner: false,
                }

                if (!result.userGameLog)
                    return json

                // update user answer status in mysql database
                result.userGameLog.status = 'Answer Confirmed'
                result.userGameLog.date_answer_confirmed = new Date()
                return result.userGameLog.save({transaction: t}).then(() => {

                    // if questionIndex is last and user answer is correct so the user is one of the winners
                    if (game.totalQuestions == game.currentQuestionIndex && isCorrect) {

                        // update user game status in mysql database
                        return models.game__users.update({
                            is_winner: 'Yes'
                        }, {
                            transaction: t,
                            where: {
                                game_id: {[Op.eq]: game.gameId},
                                user_id: {[Op.eq]: req.userId}
                            }
                        }).then(() => {
                            json.isWinner = true
                            return json
                        })
                    }

                    return json
                })
            })
        })

    }).then((jsonOutput) => {
        res.status(200).json({status: 200, status_text: 'OK', content: jsonOutput})
    }).catch(function (err) {
        res.status(err.status || 500).json({status: err.status, status_text: err.message})
    })

})


module.exports = router;

