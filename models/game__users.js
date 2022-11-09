/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('game__users', {
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
        question_lost: {
            type: DataTypes.BIGINT,
            allowNull: true,
            primaryKey: true
        },
        user_type: {
            type: DataTypes.ENUM('Player', 'Guest'),
            allowNull: false
        },
        is_winner: {
            type: DataTypes.ENUM('Yes', 'No'),
            allowNull: true,
            defaultValue: 'No'
        },
        user_game_status: {
            type: DataTypes.ENUM('Active', 'InActive'),
            allowNull: false
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
        tableName: 'game__users',
        createdAt: 'date_created',
        updatedAt: 'date_updated'
    });
};
