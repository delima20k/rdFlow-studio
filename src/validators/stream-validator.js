const { z } = require("zod");

const createStreamSchema = z.object({
  title: z.string().trim().min(3).max(80)
});

const startIngestSchema = z.object({
  streamId: z.string().uuid()
});

module.exports = {
  createStreamSchema,
  startIngestSchema
};
