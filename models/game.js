/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {

    const game = sequelize.define('game', {
        id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        secret_code: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        prize_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        prize_price: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        current_question: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        total_winners: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        total_attendees: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        total_questions: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        game_status: {
            type: DataTypes.ENUM('Draft', 'Active', 'InActive', 'Starting', 'Started', 'Finished'),
            allowNull: false,
            defaultValue: 'Draft'
        },
        comment: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        game_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        game_date_title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        date_opened: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_started: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_finished: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_closed: {
            type: DataTypes.DATE,
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
        tableName: 'game',
        createdAt: 'date_created',
        updatedAt: 'date_updated'
    });


    return game
};
