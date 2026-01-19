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
        const comp = entry.resource
        if (comp.text && comp.text.div) {
          claimValues['Text'] = htmlToText(comp.text.div)
        }
        if (comp.identifier && comp.identifier.value) {
          claimValues['Identifier'] = comp.identifier.value
        }
        else if (comp.identifier && comp.identifier.at(0) && comp.identifier.at(0).value) {
          claimValues['Identifier'] = comp.identifier.at(0).value
        }
        if (comp.subject) {
          claimValues['Subject'] = resolveUUIDReference(content, comp.subject.reference)
        }
        if (comp.date) {
          claimValues['Date'] = comp.date
        }
        if (comp.author && comp.author.reference) {
          claimValues['Author'] = resolveUUIDReference(content, comp.author.reference)
        }
        else if (comp.author && comp.author.length && comp.author.length > 0) {
          const authors = []
          for (const author of comp.author) {
            authors.push(resolveUUIDReference(content, author.reference))
          }
          claimValues['Author'] = authors.join('; ')
        }
        if (comp.event && comp.event.length && comp.event.length > 0) {
          const events = []
          for (const event of comp.event) {
            if (event.code && event.code.coding && event.code.coding.length && event.code.coding.length > 0) {
              events.push(event.code.coding.at(0).code)
            }
          }
          claimValues['event'] = events.join('; ')
        }
        if (comp.title) {
          claimValues['Title'] = comp.title
        }
        for (const section of comp.section) {
          if (!section.code || !section.text || !section.text.div) {
            continue
          }
          const key = section?.code?.coding?.at(0)?.code
          if (!key) {
            continue
          }
          claimValues[key] = htmlToText(section.text.div)
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

function htmlToText(html) {
  let text = ''

  const lis = html.match(/<li[\s\S]*?<\/li>/gi)
  if (lis) {
    console.log(`Found ${lis.length} list items in HTML content`)
    for (const li of lis) {
      const liText = li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      html = html.replace(li, liText)
    }
  }

  const tables = html.match(/<table[\s\S]*?<\/table>/gi)
  if (tables) {
    for (const table of tables) {
      const headers = []
      const ths = table.match(/<th[\s\S]*?<\/th>/gi)
      if (ths) {
        for (const header of ths) {
          const headerText = htmlToText(header).replaceAll('\n', ' ').replace(/\s+/g, ' ').trim()
          headers.push(headerText)
        }
      }
      const rows = table.match(/<tr[\s\S]*?<\/tr>/gi)
      if (rows) {
        for (const row of rows) {
          const tds = row.match(/<td[\s\S]*?<\/td>/gi)
          if (tds && tds.length == headers.length) {
            for (let i = 0; i < tds.length; i++) {
              const cellText = htmlToText(tds[i]).replaceAll('\n', ' ').replace(/\s+/g, ' ').trim()
              text += `${headers[i]}: ${cellText}\n`
            }
            text += '\n'
          }
        }
      }
      html = html.replace(table, '')
    }
  }
  text += '\n' + html.replace(/<[^>]+>/g, '\n')
  return text.replace(/\r+/g, '').replace(/[\n\s]+/g, '\n').replace(/^\n/g, '').trim()
}

function resolveUUIDReference(ipsDocument, uuid) {
  let value = ''
  for (const entry of ipsDocument.entry) {
    if (entry.fullUrl && entry.fullUrl == uuid) {
      console.log('Found reference for ', uuid, entry.resource.name)
      if (entry.resource.name && entry.resource.name[0] && entry.resource.name[0].family) {
        value += entry.resource.name[0].family
      }
      if (entry.resource.name && entry.resource.name[0] && entry.resource.name[0].given) {
        value += ', ' + entry.resource.name[0].given.join(' ')
      }
      console.log('Name: ', value)
    }
  }
  if (!value) {
    console.log('No reference found for ', uuid)
  }
  return value
}