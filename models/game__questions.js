/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    const gameQuestions = sequelize.define('game__questions', {
        game_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'game',
                key: 'id'
            },
            primaryKey: true
        },
        question_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'question',
                key: 'id'
            },
            primaryKey: true
        },
        priority: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        is_published: {
            type: DataTypes.ENUM('Yes', 'No'),
            allowNull: true,
            defaultValue: 'No'
        },
        date_published: {
            type: DataTypes.DATE,
            allowNull: true
        },
        total_answers: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        correct_answers_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        wrong_answers_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        answer_1_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        answer_2_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        answer_3_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        answer_4_count: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        date_updated: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_created: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        classMethods: {
            associate: function (models) {
                models.belongsTo('question', {foreignKey: 'question_id'});
            }
        },
        tableName: 'game__questions',
        createdAt: 'date_created',
        updatedAt: 'date_updated'
    });

    gameQuestions.getCurrentQuestion = (gameId, transaction) => {

        let query = "select q.*, g.priority\n" +
            "from game__questions g\n" +
            "  inner join question q on g.question_id = q.id\n" +
            "where g.game_id = :gameId and g.is_published = 'No'\n" +
            "order by g.priority ASC\n" +
            "limit 1"

        return sequelize.query(query, {
            replacements: {"gameId": gameId},
            type: sequelize.QueryTypes.SELECT,
            transaction: transaction
        }).then(question => {

            return (question.length > 0) ? question[0] : null
        })
    }

    gameQuestions.getAnswerStats = (gameId, questionId, transaction) => {
        let query = "select\n" +
            "  user__game_logs.game_id as gameId,\n" +
            "  user__game_logs.question_id as questionId,\n" +
            "  sum(if(user__game_logs.answer = 1, 1, 0)) as a1Count,\n" +
            "  sum(if(user__game_logs.answer = 2, 1, 0)) as a2Count,\n" +
            "  sum(if(user__game_logs.answer = 3, 1, 0)) as a3Count,\n" +
            "  sum(if(user__game_logs.answer <> question.correct_answer, 1, 0)) as totalWrongAnswer,\n" +
            "  sum(if(user__game_logs.answer = question.correct_answer, 1, 0)) as totalCorrectAnswer,\n" +
            "  count(user__game_logs.answer) as totalCount\n" +
            "from user__game_logs\n" +
            "inner join question on question.id = user__game_logs.question_id\n" +
            "inner join game__users on game__users.game_id = user__game_logs.game_id and game__users.user_id = user__game_logs.user_id \n" +
            "where game__users.user_type = 'Player' and user__game_logs.status = 'Answer Confirmed' and question_id = :questionId and user__game_logs.game_id = :gameId\n" +
            "group by user__game_logs.game_id, user__game_logs.question_id"

        return sequelize.query(query, {
            replacements: {"gameId": gameId, "questionId": questionId},
            type: sequelize.QueryTypes.SELECT,
            transaction: transaction
        }).then(question => {

            return (question.length > 0) ? question[0] : null
        })
    }

    return gameQuestions
};
