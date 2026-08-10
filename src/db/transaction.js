// ctx is the shared { db, statements } context created in db/index.js. Reading
// ctx.db at call time (rather than capturing it eagerly) lets this run correctly
// even though ctx.db is only assigned once load() opens the database.
const createTransactionRunner = (ctx) => (fn) => {
  ctx.db.exec('BEGIN IMMEDIATE');

  try {
    const result = fn();
    ctx.db.exec('COMMIT');
    return result;
  } catch (error) {
    ctx.db.exec('ROLLBACK');
    throw error;
  }
};

module.exports = { createTransactionRunner };
