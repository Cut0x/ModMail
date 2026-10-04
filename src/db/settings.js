const createSettingsApi = (ctx) => {
  const getSetting = (key) => ctx.statements.getSetting.get(key)?.value ?? null;

  const setSetting = async (key, value) => {
    ctx.statements.setSetting.run(key, value);
    return value;
  };

  return { getSetting, setSetting };
};

module.exports = { createSettingsApi };
