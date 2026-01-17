import  express from "express";
import { agent } from './agent.js'

const VALIDITY_MS = 365 * 24 * 60 * 60 * 1000 // credential validity time in milliseconds

const config = {
  "server_port": process.env.IPS_ISSUER_PORT || 4773
}

const app = express();
app.use(express.json({ limit: '1024mb' }))
app.use(express.static('public'))

app.post('/issue', async (req, res) => {
  if (!req.body.content) {
    res.status(400).json({ error: 'Missing required content' })
    return false
  }
  const content = JSON.parse(req.body.content)
  const claimValues = {}
  if (content && content.entry && Array.isArray(content.entry)) {
    for (const entry of content.entry) {
      if (entry.resource && entry.resource.resourceType == 'Composition') {
        for (const section of entry.resource.section) {
          if (!section.title || !section.text || !section.text.div) {
            continue
          }
          const key = "section" + section.title.replace(/\s+/g, '')
          claimValues[key] = section.text.div.replace(/<[^>]+>/g, '')
        }
      }
    }
  }
  const credentialParams = {
    credentialSchemaId: agent.schemas.credential.id,
    issuerDid: agent.dids[0],
    issuerKey: agent.keys[0],
    protocol: req.body.protocol || 'OPENID4VCI_FINAL1',
    claimValues: []
  }
  agent.schemas.credential.claims.forEach(claim => {
    let value
    if (claim.key == 'fullData') {
      value = content
    }
    else {
      value = claimValues[claim.key] || ''
    }
    if (value) {
      credentialParams.claimValues.push({
        claimId: claim.id,
        value: value,
        path: `${claim.key}`
      })
    }
  })
  console.log(JSON.stringify(credentialParams, null, 2))
  const offer = await agent.issueCredential(credentialParams)
  if (offer) {
    res.json(offer)
    return true
  }
  res.status(500).json({ error: 'Failed to create credential offer' })
})

app.post('/verify', async (req, res) => {
  const proofParams = {
    proofSchemaId: agent.schemas.proof.id,
    verifierDid: agent.dids[0],
    protocol: req.body.protocol || 'OPENID4VP_FINAL1'
  }
  const request = await agent.requestCredential(proofParams)
  if (request) {
    res.json(request)
    return true
  }
  res.status(500).json({ error: 'Failed to create credential request' })
})

app.get('/status/:id', async (req, res) => {
  const status = await agent.getStatus(req.params.id)
  if (status) {
    res.json(status)
    return true
  }
  res.status(500).json({ error: `Failed to check status for ${req.params.id}` })
})

app.listen(config.server_port, () => {
  console.log(`Server is running on port ${config.server_port}`)
})
