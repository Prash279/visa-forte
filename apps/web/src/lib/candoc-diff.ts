import type { FindingsJson, Finding } from './candoc-types'

export function computeDiff(prev: FindingsJson | null, curr: FindingsJson): FindingsJson {
  if (!prev) return curr

  const prevIds = new Set<string>()
  for (const layer of prev.sopLayers) {
    for (const f of layer.findings) prevIds.add(f.id)
  }

  const prevLayerMap = new Map(prev.sopLayers.map((l) => [l.layer, l]))

  const sopLayers = curr.sopLayers.map((layer) => {
    const prevLayer = prevLayerMap.get(layer.layer)
    const currIds = new Set(layer.findings.map((f) => f.id))

    const marked: Finding[] = layer.findings.map((f) =>
      prevIds.has(f.id) ? f : { ...f, isNew: true },
    )

    const resolved: Finding[] = prevLayer
      ? prevLayer.findings
          .filter((f) => !currIds.has(f.id))
          .map((f) => ({ ...f, isResolved: true }))
      : []

    return { ...layer, findings: [...marked, ...resolved] }
  })

  return { ...curr, sopLayers }
}
