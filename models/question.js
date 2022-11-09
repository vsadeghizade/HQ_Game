/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    const question = sequelize.define('question', {
        id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        question_title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        answer_1: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        answer_2: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        answer_3: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        answer_4: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        level: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        correct_answer: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Used', 'New', 'Draft', 'Deleted'),
            allowNull: false,
            defaultValue: 'Draft'
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
                question.belongsTo(sequelize.models.game__questions, {foreignKey: 'question_id'});
            }
        },
        tableName: 'question',
        createdAt: 'date_created',
        updatedAt: 'date_updated'
    });


    return question;
};
