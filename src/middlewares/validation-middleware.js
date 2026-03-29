function validationMiddleware(schema, target = "body") {
  return (request, response, next) => {
    const parsed = schema.safeParse(request[target]);

    if (!parsed.success) {
      return response.status(400).json({
        message: "Dados invalidos.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    request[target] = parsed.data;
    return next();
  };
}

module.exports = {
  validationMiddleware
};
