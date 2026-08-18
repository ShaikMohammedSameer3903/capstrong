const express = require('express');
const router = express.Router();
const k8sService = require('../services/k8sService');

// ── Single-cluster summary (original) ──
router.get('/cluster', async (req, res) => {
  try {
    const summary = await k8sService.getClusterSummary(req.tenantId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
//  MULTI-CLUSTER ENDPOINTS
// ══════════════════════════════════════════════════════════

// ── Register a new cluster ──
router.post('/clusters', async (req, res) => {
  try {
    const { name, provider, region, contextName, endpoint, metadata } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!provider) {
      return res.status(400).json({ error: 'provider is required (aks, eks, gke, or generic)' });
    }
    const result = await k8sService.registerCluster(req.tenantId, {
      name, provider, region, contextName, endpoint, metadata
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List all registered clusters ──
router.get('/clusters', async (req, res) => {
  try {
    const clusters = await k8sService.listClusters(req.tenantId);
    res.json({
      total: clusters.length,
      clusters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Remove a registered cluster ──
router.delete('/clusters/:id', async (req, res) => {
  try {
    const result = await k8sService.removeCluster(req.tenantId, req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Aggregated multi-cluster summary ──
router.get('/multi-cluster/summary', async (req, res) => {
  try {
    const summary = await k8sService.getMultiClusterSummary(req.tenantId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Federated workloads across all clusters ──
router.get('/multi-cluster/workloads', async (req, res) => {
  try {
    const workloads = await k8sService.getMultiClusterWorkloads(req.tenantId);
    res.json(workloads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

