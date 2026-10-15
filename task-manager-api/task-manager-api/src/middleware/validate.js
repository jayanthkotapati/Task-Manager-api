const ApiError = require('../utils/ApiError');

// validate({ body: schema, query: schema, params: schema })
// Parsed (coerced + defaulted) values are available on req.validated.<key>
module.exports = (schemas) => (req, res, next) => {
  req.validated = {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new ApiError(400, 'Validation failed', details));
    }
    req.validated[key] = result.data;
  }
  next();
};
