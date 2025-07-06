export default async function handler(req, res) {
  const { params } = req.query;
  
  return res.status(200).json({
    method: req.method,
    url: req.url,
    query: req.query,
    params: params,
    paramsType: typeof params,
    paramsArray: Array.isArray(params),
    parsed: params ? {
      type: params[0],
      siren: params[1], 
      siret: params[2]
    } : null,
    timestamp: new Date().toISOString()
  });
}