import fs from 'node:fs/promises';
import path from 'node:path';
import { upsertBucket } from '../common.mjs';

function validateAccessKeyMod11(key) {
  if (!/^\d{44}$/.test(key)) return false;
  const checkDigit = Number(key[43]);
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i -= 1) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const expected = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return expected === checkDigit;
}

export async function runCommunityNfceConnector({ dataDir, freshBuckets }) {
  const filePath = path.join(dataDir, 'community-nfce.json');
  let data;
  try {
    data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    data = { version: 1, updatedAt: new Date().toISOString(), submissions: [] };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  const acceptedIds = new Set();
  let acceptedCount = 0;
  for (const sub of data.submissions || []) {
    if (
      !sub?.itemId ||
      !validateAccessKeyMod11(String(sub.accessKey || '')) ||
      typeof sub.price !== 'number' ||
      sub.price <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(sub.date || '')) ||
      !/^[A-Z]{2}$/.test(String(sub.uf || ''))
    ) {
      continue;
    }
    acceptedCount += 1;
    acceptedIds.add(sub.itemId);
    upsertBucket(freshBuckets.national, sub.itemId, sub.date, sub.price, 1, sub.price, sub.price);
    upsertBucket(
      freshBuckets.state,
      `${sub.itemId}|${sub.uf}`,
      sub.date,
      sub.price,
      1,
      sub.price,
      sub.price,
    );
    if (sub.cityCode) {
      upsertBucket(
        freshBuckets.city,
        `${sub.itemId}|${sub.uf}|${sub.cityCode}`,
        sub.date,
        sub.price,
        1,
        sub.price,
        sub.price,
      );
    }
  }

  return {
    name: 'community-nfce',
    itemIds: Array.from(acceptedIds),
    accepted: acceptedCount,
  };
}
