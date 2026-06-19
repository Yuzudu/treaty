// ponytail: stub jose for e2e tests — webhooks don't use auth guard, no real JWKS needed
module.exports = {
  createRemoteJWKSet: () => () => Promise.resolve({}),
  jwtVerify: async () => ({ payload: {} }),
}
