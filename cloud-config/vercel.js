/**
 * Vercel deployment helper.
 * Uses the Vercel API to trigger deployments, list projects, and check status.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const VERCEL_API = 'https://api.vercel.com';
const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.warn('[vercel] VERCEL_TOKEN missing — API calls will fail.');
}

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Trigger a new deployment for a Vercel project.
 * @param {object} opts
 * @param {string} opts.projectId — Vercel project ID
 * @param {string} opts.teamId — optional team ID
 * @param {string} [opts.branch='main'] — git branch
 * @returns {Promise<object>} deployment object
 */
export async function deploy({ projectId, teamId, branch = 'main' }) {
  if (!token) throw new Error('VERCEL_TOKEN not set.');
  const params = teamId ? `?teamId=${teamId}` : '';
  const res = await fetch(`${VERCEL_API}/v13/deployments${params}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: projectId,
      gitSource: {
        type: 'github',
        ref: branch,
      },
      projectId,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel deploy failed: ${res.status} ${err}`);
  }
  return res.json();
}

/**
 * List deployments for a project.
 * @param {string} projectId
 * @param {string} [teamId]
 * @returns {Promise<Array>}
 */
export async function listDeployments(projectId, teamId) {
  if (!token) throw new Error('VERCEL_TOKEN not set.');
  const params = new URLSearchParams({ projectId });
  if (teamId) params.set('teamId', teamId);
  const res = await fetch(`${VERCEL_API}/v6/deployments?${params}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Vercel list failed: ${res.status}`);
  const json = await res.json();
  return json.deployments;
}

/**
 * Get deployment status.
 * @param {string} deploymentId
 * @param {string} [teamId]
 * @returns {Promise<object>}
 */
export async function getDeployment(deploymentId, teamId) {
  if (!token) throw new Error('VERCEL_TOKEN not set.');
  const params = teamId ? `?teamId=${teamId}` : '';
  const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}${params}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Vercel get failed: ${res.status}`);
  return res.json();
}

export default { deploy, listDeployments, getDeployment };