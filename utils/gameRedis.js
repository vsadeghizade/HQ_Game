async function setGame(options, redis) {

    try {

        const game = {
            gameId: options.gameId,
            currentQuestionIndex: (options.currentQuestionIndex) ? options.currentQuestionIndex : 0,
            currentQuestionId: (options.currentQuestionId) ? options.currentQuestionId : null,
            totalQuestions: (options.totalQuestions) ? options.totalQuestions : 0,
            dateOpened: (options.dateOpened) ? options.dateOpened : null,
            dateStarted: (options.dateStarted) ? options.dateStarted : null,
            dateFinished: (options.dateFinished) ? options.dateFinished : null,
            dateClosed: (options.dateClosed) ? options.dateClosed : null,
            numberOfAttendees: (options.numberOfAttendees) ? options.numberOfAttendees : 0,
            canQuestionUp: (options.canQuestionUp) ? options.canQuestionUp : true,
            state: (options.state) ? options.state : 'Starting',
        };

        const key = 'game';
        const result = await redis.set(key, JSON.stringify(game));

    } catch (error) {
        console.error(error);
    }
}

async function getCurrentGame(redis) {
    try {
        const key = 'game';
        const gameStateReturns = JSON.parse(await redis.get(key));

        console.log(gameStateReturns);
        return gameStateReturns

    } catch (error) {
        console.error(error);
    }
}

async function setCurrentGameState(currentGameState, redis) {
    try {
        const key = 'game'
        const result = await redis.set(key, JSON.stringify({
            gameId: currentGameState.gameId,
            state: currentGameState.state,
            isStatsRunning: currentGameState.isStatsRunning,
        }));
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}


async function getGame(redis) {

    try {
        const key = 'game';
        const gameReturns = JSON.parse(await redis.get(key));

        console.log(gameReturns);
        return gameReturns
    } catch (error) {
        console.error(error);
    }
}

async function resetGame(redis) {
    try {
        const key = 'game';
        const gameStateReturns = JSON.parse(await redis.del(key));

        console.log('Redis cache is deleted ', gameStateReturns);

    } catch (error) {
        console.error(error);
    }
}

async function setQuestion(question, redis) {

    try {
        const key = 'game' + '_question_' + question.id.toString();
        const result = await redis.set(key, JSON.stringify(question));
        console.log(result);
    } catch (error) {
        console.error(error);
    }
}

async function getQuestion(questionId, redis) {

    try {
        const key = 'game' + '_question_' + questionId.toString();

        const questionReturns = JSON.parse(await redis.get(key));

        return questionReturns

    } catch (error) {
        console.error(error);
    }
}


module.exports = {setGame, getGame, getQuestion, setQuestion, resetGame};
