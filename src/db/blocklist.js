const createBlocklistApi = (ctx) => {
  const isBlocked = (userId) => Boolean(ctx.statements.isBlocked.get(userId));

  const isSpamIgnored = (userId) => Boolean(ctx.statements.isSpamIgnored.get(userId));

  const addSpamIgnoredUser = async (userId) => {
    ctx.statements.addSpamIgnoredUser.run(userId, new Date().toISOString());
    return ctx.statements.getSpamIgnoredUser.get(userId);
  };

  const blockUser = async ({ userId, blockedBy, reason = null }) => {
    ctx.statements.blockUser.run(userId, blockedBy, new Date().toISOString(), reason);
    return ctx.statements.getBlockedUser.get(userId);
  };

  const unblockUser = async (userId) => {
    const blocked = ctx.statements.getBlockedUser.get(userId) ?? null;
    if (!blocked) return null;
    ctx.statements.unblockUser.run(userId);
    return blocked;
  };

  return { isBlocked, isSpamIgnored, addSpamIgnoredUser, blockUser, unblockUser };
};

module.exports = { createBlocklistApi };
