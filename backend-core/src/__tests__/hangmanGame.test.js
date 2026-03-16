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
});
