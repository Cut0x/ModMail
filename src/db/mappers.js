const boolToInt = (value) => (value ? 1 : 0);
const intToBool = (value) => Boolean(value);

const mapTicket = (row) => {
  if (!row) return null;
  return {
    ...row,
    welcomed: intToBool(row.welcomed),
  };
};

module.exports = { boolToInt, intToBool, mapTicket };
