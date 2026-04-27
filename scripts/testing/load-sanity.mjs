#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const PROJECT_KEY = process.env.PROJECT_KEY;
const API_KEY = process.env.API_KEY;
const COLLECTION = process.env.COLLECTION ?? "load_sanity";
const REQUESTS = Number(process.env.REQUESTS ?? 200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);

if (!PROJECT_KEY || !API_KEY) {
  console.error("Missing required env vars: PROJECT_KEY and API_KEY");
  process.exit(1);
}

const target = `${BASE_URL}/api/v1/${PROJECT_KEY}/records?collection=${encodeURIComponent(COLLECTION)}`;
const latenciesMs = [];
const statusCounts = new Map();

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function oneRequest() {
  const start = performance.now();
  let status = 0;

  try {
    const response = await fetch(target, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    status = response.status;
    await response.arrayBuffer();
  } catch {
    status = 0;
  }

  const duration = performance.now() - start;
  latenciesMs.push(duration);
  statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
}

let issued = 0;

async function worker() {
  while (true) {
    issued += 1;
    if (issued > REQUESTS) {
      return;
    }
    await oneRequest();
  }
}

const startAll = performance.now();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
const totalDuration = performance.now() - startAll;

latenciesMs.sort((a, b) => a - b);
const p50 = percentile(latenciesMs, 50);
const p95 = percentile(latenciesMs, 95);
const p99 = percentile(latenciesMs, 99);

const total = latenciesMs.length;
const failures = (statusCounts.get(0) ?? 0) + Array.from(statusCounts.entries())
  .filter(([status]) => status >= 500)
  .reduce((sum, [, count]) => sum + count, 0);
const rateLimited = statusCounts.get(429) ?? 0;
const failureRate = total > 0 ? (failures / total) * 100 : 100;

console.log("Load sanity summary");
console.log(`Target: ${target}`);
console.log(`Requests: ${REQUESTS}, concurrency: ${CONCURRENCY}`);
console.log(`Completed: ${total} in ${(totalDuration / 1000).toFixed(2)}s`);
console.log(`Throughput: ${(total / (totalDuration / 1000)).toFixed(1)} req/s`);
console.log(`Latency p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms`);

const orderedStatuses = Array.from(statusCounts.keys()).sort((a, b) => a - b);
for (const status of orderedStatuses) {
  console.log(`status ${status}: ${statusCounts.get(status)}`);
}

if (rateLimited === 0) {
  console.warn("Warning: no 429 responses observed. Rate limit may not have been reached.");
}

if (failureRate > 2) {
  console.error(`Failure threshold exceeded: ${failureRate.toFixed(2)}% (> 2%)`);
  process.exit(1);
}

console.log("Load sanity passed");
