const normalizeCannedResponseName = (name) => name.trim().toLowerCase().slice(0, 60);

const createCannedResponsesApi = (ctx) => {
  const getCannedResponse = (name) =>
    ctx.statements.getCannedResponse.get(normalizeCannedResponseName(name)) ?? null;

  const listCannedResponses = () => ctx.statements.allCannedResponses.all();

  const upsertCannedResponse = async ({ name, content, createdBy }) => {
    const normalized = normalizeCannedResponseName(name);
    const existing = getCannedResponse(normalized);
    const now = new Date().toISOString();

    ctx.statements.upsertCannedResponse.run(
      normalized,
      content,
      createdBy,
      existing?.createdAt ?? now,
      now,
    );

    return getCannedResponse(normalized);
  };

  const deleteCannedResponse = (name) => {
    const normalized = normalizeCannedResponseName(name);
    const existing = getCannedResponse(normalized);
    if (!existing) return null;

    ctx.statements.deleteCannedResponse.run(normalized);
    return existing;
  };

  return { getCannedResponse, listCannedResponses, upsertCannedResponse, deleteCannedResponse };
};

module.exports = { createCannedResponsesApi, normalizeCannedResponseName };
