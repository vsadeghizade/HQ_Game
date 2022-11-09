/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('user__game_logs', {
        game_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            primaryKey: true
        },
        question_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            primaryKey: true
        },
        answer: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        is_correct: {
            type: DataTypes.ENUM('Yes', 'No'),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Question Sent', 'Answered', 'Answer Confirmed'),
            allowNull: false,
            defaultValue: 'Question Sent'
        },
        date_created: {
            type: DataTypes.DATE,
            allowNull: false
        },
        date_answer_confirmed: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_question_ack: {
            type: DataTypes.DATE,
            allowNull: true
        },

    }, {
        tableName: 'user__game_logs',
        createdAt: 'date_created',
        updatedAt: false
    });
};
