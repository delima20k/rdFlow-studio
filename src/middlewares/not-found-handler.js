function notFoundHandler(_request, response) {
  return response.status(404).json({
    message: "Rota nao encontrada."
  });
}

module.exports = {
  notFoundHandler
};
