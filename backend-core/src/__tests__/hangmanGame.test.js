import mongoose from 'mongoose';
import HangmanGame from '../models/HangmanGame.js';

describe('HangmanGame accent handling', () => {
  it('reveals repeated letters even when the word contains accents', () => {
    const teacherId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const game = new HangmanGame({
      teacher: teacherId,
      word: 'MATEMÁTICA',
      status: 'active',
      startedAt: new Date()
    });

    game.addPlayer(studentId, 'Aluno');

    const result = game.guessLetter('A', studentId);

    expect(result.success).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.revealedWord).toBe('_A___Á___A');
    expect(game.players[0].score).toBe(30);
  });

  it('accepts a full-word guess without requiring accents', () => {
    const teacherId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const game = new HangmanGame({
      teacher: teacherId,
      word: 'FÓRMULA',
      status: 'active',
      startedAt: new Date()
    });

    game.addPlayer(studentId, 'Aluno');

    const result = game.guessWord('FORMULA', studentId);

    expect(result.success).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.status).toBe('won');
    expect(game.status).toBe('won');
    expect(game.getRevealedWord()).toBe('FÓRMULA');
  });

  it('restarts the same player turn with penalty when only one student times out', () => {
    const teacherId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const game = new HangmanGame({
      teacher: teacherId,
      word: 'ENERGIA',
      turnBased: true,
      turnDurationSeconds: 20
    });

    game.addPlayer(studentId, 'Aluno Solo');
    game.startGame();

    const initialTurnExpiresAt = game.currentTurnExpiresAt;
    const timeoutResult = game.handleTurnTimeout();

    expect(timeoutResult.penaltyApplied).toBe(true);
    expect(game.wrongGuesses).toBe(1);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.currentTurnExpiresAt.getTime()).toBeGreaterThan(initialTurnExpiresAt.getTime());
  });

  it('passes the turn to the next invited player without penalty on multiplayer timeout', () => {
    const teacherId = new mongoose.Types.ObjectId();
    const firstStudentId = new mongoose.Types.ObjectId();
    const secondStudentId = new mongoose.Types.ObjectId();
    const game = new HangmanGame({
      teacher: teacherId,
      word: 'GEOGRAFIA',
      turnBased: true,
      turnDurationSeconds: 15
    });

    game.addPlayer(firstStudentId, 'Aluno 1');
    game.addPlayer(secondStudentId, 'Aluno 2');
    game.startGame();

    const timeoutResult = game.handleTurnTimeout();

    expect(timeoutResult.penaltyApplied).toBe(false);
    expect(game.wrongGuesses).toBe(0);
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.getCurrentPlayer().name).toBe('Aluno 2');
  });

  it('initializes turn timing metadata when the game starts', () => {
    const teacherId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const game = new HangmanGame({
      teacher: teacherId,
      word: 'DISCIPLINA',
      turnDurationSeconds: 35
    });

    game.addPlayer(studentId, 'Aluno');
    game.startGame();

    expect(game.status).toBe('active');
    expect(game.roundNumber).toBe(1);
    expect(game.currentTurnStartedAt).toBeInstanceOf(Date);
    expect(game.currentTurnExpiresAt).toBeInstanceOf(Date);
    expect(game.currentTurnExpiresAt.getTime() - game.currentTurnStartedAt.getTime()).toBe(35000);
  });
});
